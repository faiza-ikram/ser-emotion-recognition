export default function AnalysisProgress({ progress, onCancel }) {
    return (
        <div className="progress-overlay">
            <div className="progress-card">
                <button className="btn-close-prog" onClick={onCancel}>&times;</button>
                <h3>Analyzing voice...</h3>
                <div className="progress-bar-track">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <p className="progress-pct">{Math.round(progress)}%</p>
            </div>
        </div>
    )
}
