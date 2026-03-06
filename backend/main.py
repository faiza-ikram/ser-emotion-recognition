import os
import io
import pickle
import warnings
import numpy as np
import librosa
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"

# ─── Load model artifacts ──────────────────────────────────────────────────────
# Models are now located in the same directory as main.py
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))

MODEL_PATH   = os.path.join(BACKEND_DIR, "best_model.keras")
SCALER_PATH  = os.path.join(BACKEND_DIR, "scaler.pkl")
ENCODER_PATH = os.path.join(BACKEND_DIR, "encoder.pkl")

# Lazy-loaded globals
_model   = None
_scaler  = None
_encoder = None

def load_artifacts():
    global _model, _scaler, _encoder
    if _model is None:
        try:
            import keras  # Keras 3 standalone (TF 2.16+)
            _model = keras.models.load_model(MODEL_PATH)
        except Exception:
            import tensorflow as tf
            _model = tf.keras.models.load_model(MODEL_PATH)
        with open(SCALER_PATH,  "rb") as f: _scaler  = pickle.load(f)
        with open(ENCODER_PATH, "rb") as f: _encoder = pickle.load(f)


# ─── Feature extraction ────────────────────────────────────────────────────────
import tempfile

def extract_features(audio_bytes: bytes, sample_rate: int = 22050) -> np.ndarray:
    """
    Extracts 162 features to match the training pipeline:
    - Zero Crossing Rate (1)
    - Chroma STFT (12)
    - MFCC (20)
    - RMS Energy (1)
    - Mel Spectrogram (128)
    Returns shape: (1, 162)
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        # Load audio (mirroring notebook: duration 2.5s, offset 0.6s if possible, but safe here)
        y, sr = librosa.load(tmp_path, sr=sample_rate, duration=2.5, offset=0.6)
        
        # ── Normalization (Fix for "Loud == Angry") ─────────────────────────
        # This ensures the model looks at the emotional quality, not volume.
        y = librosa.util.normalize(y)
        
        result = np.array([])
        
        # 1. ZCR
        zcr = np.mean(librosa.feature.zero_crossing_rate(y=y).T, axis=0)
        result = np.hstack((result, zcr))
        
        # 2. Chroma
        stft = np.abs(librosa.stft(y))
        chroma_stft = np.mean(librosa.feature.chroma_stft(S=stft, sr=sr).T, axis=0)
        result = np.hstack((result, chroma_stft))
        
        # 3. MFCC
        mfcc = np.mean(librosa.feature.mfcc(y=y, sr=sr).T, axis=0)
        result = np.hstack((result, mfcc))
        
        # 4. RMS
        rms = np.mean(librosa.feature.rms(y=y).T, axis=0)
        result = np.hstack((result, rms))
        
        # 5. Mel Spectrogram
        mel = np.mean(librosa.feature.melspectrogram(y=y, sr=sr).T, axis=0)
        result = np.hstack((result, mel))
        
        return result.reshape(1, -1)
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)



# ─── FastAPI app ───────────────────────────────────────────────────────────────
app = FastAPI(
    title="SER API – Speech Emotion Recognition",
    description="Upload a WAV audio file and receive the detected emotion.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    load_artifacts()
    print("Model, scaler and encoder loaded OK.")

@app.get("/")
def root():
    return {"message": "SER API is running. POST audio to /predict"}

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    """
    Accepts a WAV (or any librosa-compatible) audio file.
    Returns:
        {
            "emotion":        "happy",
            "confidence":     0.87,
            "probabilities":  {"angry": 0.02, "calm": 0.01, ...}
        }
    """
    load_artifacts()   # No-op after first call

    # ── Validate ────────────────────────────────────────────────────────────
    allowed = {"audio/wav", "audio/wave", "audio/x-wav",
               "audio/mpeg", "audio/ogg", "audio/webm", "application/octet-stream"}
    if file.content_type and file.content_type not in allowed:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type: {file.content_type}. Please upload a WAV file."
        )

    try:
        audio_bytes = await file.read()
        if len(audio_bytes) == 0:
            raise HTTPException(status_code=400, detail="Uploaded file is empty.")

        # ── Extract features ────────────────────────────────────────────────
        features = extract_features(audio_bytes)

        # ── Scale ───────────────────────────────────────────────────────────
        features_scaled = _scaler.transform(features)

        # ── Reshape for Conv1D: (batch, timesteps, channels) ────────────────
        features_reshaped = features_scaled.reshape(
            features_scaled.shape[0], features_scaled.shape[1], 1
        )

        # ── Predict ─────────────────────────────────────────────────────────
        probs = _model.predict(features_reshaped, verbose=0)[0]   # shape: (n_classes,)

        # ── Decode labels ───────────────────────────────────────────────────
        # encoder.pkl is a sklearn LabelEncoder or OneHotEncoder
        if hasattr(_encoder, "categories_"):           # OneHotEncoder
            labels = _encoder.categories_[0].tolist()
        else:                                          # LabelEncoder
            labels = _encoder.classes_.tolist()

        top_idx   = int(np.argmax(probs))
        emotion   = str(labels[top_idx])
        confidence = float(probs[top_idx])

        probabilities = {str(labels[i]): float(probs[i]) for i in range(len(labels))}

        return JSONResponse({
            "emotion":       emotion,
            "confidence":    round(confidence, 4),
            "probabilities": {k: round(v, 4) for k, v in probabilities.items()},
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")
