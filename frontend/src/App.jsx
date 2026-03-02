import { useState, useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import Recorder from './components/Recorder'
import AnalysisProgress from './components/AnalysisProgress'
import Result from './components/Result'
import AuthModal from './components/AuthModal'
import axios from 'axios'

// Use environment variable for API URL in production
const API = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8001'

function App() {
  // UI states: 'home' | 'recording' | 'analyzing' | 'result'
  const [view, setView] = useState('home')
  const [showAuth, setShowAuth] = useState(false)
  const [user, setUser] = useState(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState(null)
  const [audioBlob, setAudioBlob] = useState(null)

  // Track auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
    })
    return () => unsubscribe()
  }, [])

  const handleRecordStart = () => {
    if (!user) {
      setShowAuth(true)
      return
    }
    setView('recording')
  }

  const handleRecordDone = (blob) => {
    setAudioBlob(blob)
    analyzeAudio(blob)
  }

  const analyzeAudio = async (blob) => {
    setView('analyzing')
    setProgress(0)

    // Fake progress while waiting for API
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) { clearInterval(interval); return 90 }
        return prev + Math.random() * 15
      })
    }, 300)

    try {
      const formData = new FormData()
      formData.append('file', blob, 'recording.wav')
      const res = await axios.post(`${API}/predict`, formData)
      clearInterval(interval)
      setProgress(100)
      setTimeout(() => {
        setResult(res.data)
        setView('result')
      }, 400)
    } catch (err) {
      clearInterval(interval)
      alert('Analysis failed: ' + (err.response?.data?.detail || err.message))
      setView('home')
    }
  }

  const handleReset = () => {
    setView('home')
    setResult(null)
    setAudioBlob(null)
    setProgress(0)
  }

  return (
    <>
      <Navbar user={user} onDashboard={() => setShowAuth(true)} />

      {view === 'home' && <Hero onRecord={handleRecordStart} />}
      {view === 'recording' && <Recorder onDone={handleRecordDone} onCancel={handleReset} />}
      {view === 'analyzing' && <AnalysisProgress progress={progress} onCancel={handleReset} />}
      {view === 'result' && <Result data={result} onAgain={handleReset} />}

      {showAuth && (
        <AuthModal
          onClose={() => setShowAuth(false)}
          onLoginSuccess={(u) => setUser(u)}
        />
      )}
    </>
  )
}

export default App

