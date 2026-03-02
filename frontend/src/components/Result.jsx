export default function Result({ data, onAgain }) {
    if (!data) return null

    // Sort probabilities to show top 3 or all
    const sortedProbabilities = Object.entries(data.probabilities)
        .sort(([, a], [, b]) => b - a)

    return (
        <section className="hero">
            <div className="result-card">
                <h2>Detected Emotion</h2>
                <div className="emotion-badge">{data.emotion}</div>
                <p className="confidence-text">
                    Confidence Score: {(data.confidence * 100).toFixed(1)}%
                </p>

                <div style={{ marginTop: '24px' }}>
                    {sortedProbabilities.map(([emotion, prob]) => (
                        <div key={emotion} className="prob-row">
                            <span className="prob-label">{emotion}</span>
                            <div className="prob-track">
                                <div
                                    className="prob-fill"
                                    style={{ width: `${prob * 100}%` }}
                                ></div>
                            </div>
                            <span className="prob-val">{Math.round(prob * 100)}%</span>
                        </div>
                    ))}
                </div>

                <button className="btn-again" onClick={onAgain}>
                    Try Another Recording
                </button>
            </div>
        </section>
    )
}
