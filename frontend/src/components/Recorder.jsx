import { useEffect, useRef, useState } from 'react'
import WaveSurfer from 'wavesurfer.js'

export default function Recorder({ onDone, onCancel }) {
    const [isRecording, setIsRecording] = useState(false)
    const [duration, setDuration] = useState(0)

    const waveformRef = useRef(null)
    const wavesurfer = useRef(null)
    const mediaRecorder = useRef(null)
    const chunks = useRef([])
    const timer = useRef(null)

    useEffect(() => {
        // Initialize WaveSurfer
        wavesurfer.current = WaveSurfer.create({
            container: waveformRef.current,
            waveColor: '#D1D5DB',
            progressColor: '#2563EB',
            cursorWidth: 0,
            barWidth: 3,
            barRadius: 3,
            responsive: true,
            height: 80,
            interact: false
        })

        startRecording()

        return () => {
            stopRecording()
            if (wavesurfer.current) wavesurfer.current.destroy()
            if (timer.current) clearInterval(timer.current)
        }
    }, [])

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
            const audioContext = new (window.AudioContext || window.webkitAudioContext)()
            const source = audioContext.createMediaStreamSource(stream)
            const processor = audioContext.createScriptProcessor(4096, 1, 1)

            const leftChannel = []
            const recordingRef = { current: true }

            processor.onaudioprocess = (e) => {
                if (!recordingRef.current) return
                const inputData = e.inputBuffer.getChannelData(0)
                leftChannel.push(new Float32Array(inputData))
            }

            source.connect(processor)
            processor.connect(audioContext.destination)

            mediaRecorder.current = {
                stop: () => {
                    recordingRef.current = false
                    setIsRecording(false)
                    stream.getTracks().forEach(track => track.stop())
                    source.disconnect()
                    processor.disconnect()

                    const wavBlob = exportWAV(leftChannel, audioContext.sampleRate)
                    onDone(wavBlob)
                }
            }

            setIsRecording(true)
            timer.current = setInterval(() => {
                setDuration(prev => prev + 1)
            }, 1000)


        } catch (err) {
            console.error('Mic access denied', err)
            onCancel()
        }
    }

    const exportWAV = (buffers, sampleRate) => {
        const buffer = flattenArray(buffers)
        const dataview = createWavFile(buffer, sampleRate)
        return new Blob([dataview], { type: 'audio/wav' })
    }

    const flattenArray = (channelBuffer) => {
        const result = new Float32Array(channelBuffer.length * 4096)
        let offset = 0
        for (let i = 0; i < channelBuffer.length; i++) {
            result.set(channelBuffer[i], offset)
            offset += channelBuffer[i].length
        }
        return result
    }

    const createWavFile = (samples, sampleRate) => {
        const buffer = new ArrayBuffer(44 + samples.length * 2)
        const view = new DataView(buffer)

        writeString(view, 0, 'RIFF')
        view.setUint32(4, 32 + samples.length * 2, true)
        writeString(view, 8, 'WAVE')
        writeString(view, 12, 'fmt ')
        view.setUint32(16, 16, true)
        view.setUint16(20, 1, true)
        view.setUint16(22, 1, true)
        view.setUint32(24, sampleRate, true)
        view.setUint32(28, sampleRate * 2, true)
        view.setUint16(32, 2, true)
        view.setUint16(34, 16, true)
        writeString(view, 36, 'data')
        view.setUint32(40, samples.length * 2, true)

        floatTo16BitPCM(view, 44, samples)

        return view
    }

    const writeString = (view, offset, string) => {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i))
        }
    }

    const floatTo16BitPCM = (output, offset, input) => {
        for (let i = 0; i < input.length; i++, offset += 2) {
            const s = Math.max(-1, Math.min(1, input[i]))
            output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
        }
    }


    const stopRecording = () => {
        if (mediaRecorder.current && isRecording) {
            mediaRecorder.current.stop()
            setIsRecording(false)
            clearInterval(timer.current)
        }
    }

    const formatTime = (s) => {
        const min = Math.floor(s / 60)
        const sec = s % 60
        return `${min}:${sec.toString().padStart(2, '0')}`
    }

    return (
        <section className="hero">
            <div className="waveform-wrapper">
                <p className="recording-label">
                    <span className="rec-dot"></span>
                    Listening and analyzing...
                </p>

                <div id="waveform" ref={waveformRef}></div>
                <p className="timer">{formatTime(duration)}</p>

                <div className="recorder-controls" style={{ marginTop: '24px' }}>
                    <button className="btn-done" onClick={stopRecording}>
                        Done
                    </button>
                    <button className="btn-secondary" onClick={() => (isRecording ? stopRecording() : startRecording())}>
                        {isRecording ? 'Pause' : 'Resume'}
                    </button>
                </div>
            </div>
        </section>
    )
}
