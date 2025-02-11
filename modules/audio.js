export const getKnownAudio = () => ({
	// Chrome
	[-20.538286209106445]: [
		124.0434488439787,
		124.04344968475198,
		124.04347527516074,
		124.04347503720783,
		124.04347657808103
	],
	[-20.538288116455078]: [
		124.04347527516074,
		124.04344884395687,
		124.04344968475198,
		124.04347657808103,
		124.04347730590962,
		124.0434806260746
	],
	[-20.535268783569336]: [124.080722568091],

	// Firefox Android
	[-31.502185821533203]: [35.74996031448245, 35.7499681673944],
	// Firefox windows/mac/linux
	[-31.50218963623047]: [35.74996031448245],
	[-31.509262084960938]: [35.7383295930922, 35.73833402246237] 
})

const audioTrap = Math.random()

export const getOfflineAudioContext = async imports => {

	const {
		require: {
			queueEvent,
			createTimer,
			captureError,
			attempt,
			caniuse,
			sendToTrash,
			documentLie,
			lieProps,
			phantomDarkness,
			logTestResult
		}
	} = imports

	try {
		const timer = createTimer()
		await queueEvent(timer)
		const win = phantomDarkness ? phantomDarkness : window
		const audioContext = caniuse(() => win.OfflineAudioContext || win.webkitOfflineAudioContext)
		if (!audioContext) {
			logTestResult({ test: 'audio', passed: false })
			return
		}
		// detect lies
		const channelDataLie = lieProps['AudioBuffer.getChannelData']
		const copyFromChannelLie = lieProps['AudioBuffer.copyFromChannel']
		let lied = (channelDataLie || copyFromChannelLie) || false

		const bufferLen = 5000
		const context = new audioContext(1, bufferLen, 44100)
		const analyser = context.createAnalyser()
		const oscillator = context.createOscillator()
		const dynamicsCompressor = context.createDynamicsCompressor()
		const biquadFilter = context.createBiquadFilter()

		// detect lie
		const dataArray = new Float32Array(analyser.frequencyBinCount)
		analyser.getFloatFrequencyData(dataArray)
		const floatFrequencyUniqueDataSize = new Set(dataArray).size
		if (floatFrequencyUniqueDataSize > 1) {
			lied = true
			const floatFrequencyDataLie = `expected -Infinity (silence) and got ${floatFrequencyUniqueDataSize} frequencies`
			documentLie(`AnalyserNode.getFloatFrequencyData`, floatFrequencyDataLie)
		}

		const values = {
			['AnalyserNode.channelCount']: attempt(() => analyser.channelCount),
			['AnalyserNode.channelCountMode']: attempt(() => analyser.channelCountMode),
			['AnalyserNode.channelInterpretation']: attempt(() => analyser.channelInterpretation),
			['AnalyserNode.context.sampleRate']: attempt(() => analyser.context.sampleRate),
			['AnalyserNode.fftSize']: attempt(() => analyser.fftSize),
			['AnalyserNode.frequencyBinCount']: attempt(() => analyser.frequencyBinCount),
			['AnalyserNode.maxDecibels']: attempt(() => analyser.maxDecibels),
			['AnalyserNode.minDecibels']: attempt(() => analyser.minDecibels),
			['AnalyserNode.numberOfInputs']: attempt(() => analyser.numberOfInputs),
			['AnalyserNode.numberOfOutputs']: attempt(() => analyser.numberOfOutputs),
			['AnalyserNode.smoothingTimeConstant']: attempt(() => analyser.smoothingTimeConstant),
			['AnalyserNode.context.listener.forwardX.maxValue']: attempt(() => {
				return caniuse(() => analyser.context.listener.forwardX.maxValue)
			}),
			['BiquadFilterNode.gain.maxValue']: attempt(() => biquadFilter.gain.maxValue),
			['BiquadFilterNode.frequency.defaultValue']: attempt(() => biquadFilter.frequency.defaultValue),
			['BiquadFilterNode.frequency.maxValue']: attempt(() => biquadFilter.frequency.maxValue),
			['DynamicsCompressorNode.attack.defaultValue']: attempt(() => dynamicsCompressor.attack.defaultValue),
			['DynamicsCompressorNode.knee.defaultValue']: attempt(() => dynamicsCompressor.knee.defaultValue),
			['DynamicsCompressorNode.knee.maxValue']: attempt(() => dynamicsCompressor.knee.maxValue),
			['DynamicsCompressorNode.ratio.defaultValue']: attempt(() => dynamicsCompressor.ratio.defaultValue),
			['DynamicsCompressorNode.ratio.maxValue']: attempt(() => dynamicsCompressor.ratio.maxValue),
			['DynamicsCompressorNode.release.defaultValue']: attempt(() => dynamicsCompressor.release.defaultValue),
			['DynamicsCompressorNode.release.maxValue']: attempt(() => dynamicsCompressor.release.maxValue),
			['DynamicsCompressorNode.threshold.defaultValue']: attempt(() => dynamicsCompressor.threshold.defaultValue),
			['DynamicsCompressorNode.threshold.minValue']: attempt(() => dynamicsCompressor.threshold.minValue),
			['OscillatorNode.detune.maxValue']: attempt(() => oscillator.detune.maxValue),
			['OscillatorNode.detune.minValue']: attempt(() => oscillator.detune.minValue),
			['OscillatorNode.frequency.defaultValue']: attempt(() => oscillator.frequency.defaultValue),
			['OscillatorNode.frequency.maxValue']: attempt(() => oscillator.frequency.maxValue),
			['OscillatorNode.frequency.minValue']: attempt(() => oscillator.frequency.minValue)
		}
		const getRenderedBuffer = (context) => new Promise(resolve => {
			const analyser = context.createAnalyser()
			const oscillator = context.createOscillator()
			const dynamicsCompressor = context.createDynamicsCompressor()

			try {
				oscillator.type = 'triangle'
				oscillator.frequency.value = 10000
				dynamicsCompressor.threshold.value = -50
				dynamicsCompressor.knee.value = 40
				dynamicsCompressor.attack.value = 0
			} catch (err) {}

			oscillator.connect(dynamicsCompressor)
			dynamicsCompressor.connect(analyser)
			dynamicsCompressor.connect(context.destination)

			oscillator.start(0)
			context.startRendering()
			
			return context.addEventListener('complete', event => {
				try {
					dynamicsCompressor.disconnect()
					oscillator.disconnect()
					const floatFrequencyData = new Float32Array(analyser.frequencyBinCount)
					analyser.getFloatFrequencyData(floatFrequencyData)
					const floatTimeDomainData = new Float32Array(analyser.fftSize)
					if ('getFloatTimeDomainData' in analyser) {
						analyser.getFloatTimeDomainData(floatTimeDomainData)
					}
					return resolve({
						floatFrequencyData,
						floatTimeDomainData,
						buffer: event.renderedBuffer,
						compressorGainReduction: (
							dynamicsCompressor.reduction.value || // webkit
							dynamicsCompressor.reduction
						)
					})
				}
				catch (error) {
					return resolve()
				}
			})
		})
		await queueEvent(timer)
		const {
			floatFrequencyData,
			floatTimeDomainData,
			buffer,
			compressorGainReduction
		} = await getRenderedBuffer(new audioContext(1, bufferLen, 44100)) || {}
		
		await queueEvent(timer)
		const getSum = arr => !arr ? 0 : arr.reduce((acc, curr) => (acc += Math.abs(curr)), 0)
		const floatFrequencyDataSum = getSum(floatFrequencyData)
		const floatTimeDomainDataSum = getSum(floatTimeDomainData)

		const copy = new Float32Array(bufferLen)
		caniuse(() => buffer.copyFromChannel(copy, 0))
		const bins = caniuse(() => buffer.getChannelData(0)) || []
		const copySample = [...copy].slice(4500, 4600)
		const binsSample = [...bins].slice(4500, 4600)
		const sampleSum = getSum([...bins].slice(4500, bufferLen))
		
		// detect lies

		// sample matching
		const matching = '' + binsSample == '' + copySample
		const copyFromChannelSupported = ('copyFromChannel' in AudioBuffer.prototype)
		if (copyFromChannelSupported && !matching) {
			lied = true
			const audioSampleLie = 'getChannelData and copyFromChannel samples mismatch'
			documentLie('AudioBuffer', audioSampleLie)
		}

		// sample uniqueness
		const totalUniqueSamples = new Set([...bins]).size
		if (totalUniqueSamples == bufferLen) {
			const audioUniquenessTrash = `${totalUniqueSamples} unique samples of ${bufferLen} is too high`
			sendToTrash('AudioBuffer', audioUniquenessTrash)
		}

		// sample noise factor
		const getRandFromRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min
		const getCopyFrom = (rand, buffer, copy) => {
			const { length } = buffer
			const start = getRandFromRange(275, length-1)
			const mid = start+10
			const end = start+20
			buffer.getChannelData(0)[start] = rand
			buffer.getChannelData(0)[mid] = rand
			buffer.getChannelData(0)[end] = rand
			buffer.copyFromChannel(copy, 0)
			const attack = (
				buffer.getChannelData(0)[start] === 0 ||
				buffer.getChannelData(0)[mid] === 0 ||
				buffer.getChannelData(0)[end] === 0 ? Math.random() : 0
			)
			return [...new Set([...buffer.getChannelData(0), ...copy, attack])].filter(x => x !== 0)
		}

		const getCopyTo = (rand, buffer, copy) => {
			buffer.copyToChannel(copy.map((x) => rand), 0)
			const frequency = buffer.getChannelData(0)[0]
			const dataAttacked = [...buffer.getChannelData(0)]
				.map(x => x !== frequency || !x ? Math.random() : x)
			return dataAttacked.filter(x => x !== frequency)
		}
		
		const getNoiseFactor = () => {
			const length = 2000
			try {
				const result = [...new Set([
					...getCopyFrom(
						audioTrap,
						new AudioBuffer({ length, sampleRate: 44100 }),
						new Float32Array(length)
					),
					...getCopyTo(
						audioTrap,
						new AudioBuffer({ length, sampleRate: 44100 }),
						new Float32Array(length)
					)
				])]
				return +(
					result.length !== 1 &&
					result.reduce((acc, n) => acc += +n, 0)
				)
			}
			catch (error) {
				console.error(error)
				return 0
			}
		}
		
		const noiseFactor = getNoiseFactor()
		const noise = (
			noiseFactor || [...new Set(bins.slice(0, 100))].reduce((acc, n) => acc += n, 0)
		)
		
		if (noise) {
			lied = true
			const audioSampleNoiseLie = 'sample noise detected'
			documentLie('AudioBuffer', audioSampleNoiseLie)
		}
		logTestResult({ time: timer.stop(), test: 'audio', passed: true })
		return {
			totalUniqueSamples,
			compressorGainReduction,
			floatFrequencyDataSum,
			floatTimeDomainDataSum,
			sampleSum,
			binsSample,
			copySample: copyFromChannelSupported ? copySample : [undefined],
			values,
			noise,
			lied
		}
			
	}
	catch (error) {
		logTestResult({ test: 'audio', passed: false })
		captureError(error, 'OfflineAudioContext failed or blocked by client')
		return
	}

}

export const audioHTML = ({ fp, note, modal, getDiffs, hashMini, hashSlice, performanceLogger }) => {
	if (!fp.offlineAudioContext) {
		return `<div class="col-four undefined">
			<strong>Audio</strong>
			<div>sum: ${note.blocked}</div>
			<div>gain: ${note.blocked}</div>
			<div>freq: ${note.blocked}</div>
			<div>time: ${note.blocked}</div>
			<div>trap: ${note.blocked}</div>
			<div>unique: ${note.blocked}</div>
			<div>data: ${note.blocked}</div>
			<div>copy: ${note.blocked}</div>
			<div>values: ${note.blocked}</div>
		</div>`
	}
	const {
		offlineAudioContext: {
			$hash,
			totalUniqueSamples,
			compressorGainReduction,
			floatFrequencyDataSum,
			floatTimeDomainDataSum,
			sampleSum,
			binsSample,
			copySample,
			lied,
			noise,
			values
		}
	} = fp
	const knownSums = getKnownAudio()[compressorGainReduction] || []
	const validAudio = sampleSum && compressorGainReduction && knownSums
	const matchesKnownAudio = knownSums.includes(sampleSum)
	return `
	<div class="relative col-four${lied ? ' rejected' : ''}">
		<span class="aside-note">${performanceLogger.getLog().audio}</span>
		<strong>Audio</strong><span class="${lied ? 'lies ' : ''}hash">${hashSlice($hash)}</span>
		<div class="help" title="AudioBuffer.getChannelData()">sum: ${
			!validAudio || matchesKnownAudio ? sampleSum : getDiffs({
				stringA: knownSums[0],
				stringB: sampleSum,
				charDiff: true,
				decorate: diff => `<span class="bold-fail">${diff}</span>`
			})
		}</div>
		<div class="help" title="DynamicsCompressorNode.reduction">gain: ${
			compressorGainReduction || note.blocked
		}</div>
		<div class="help" title="AnalyserNode.getFloatFrequencyData()">freq: ${
			floatFrequencyDataSum || note.blocked
		}</div>
		<div class="help" title="AnalyserNode.getFloatTimeDomainData()">time: ${
			floatTimeDomainDataSum || note.unsupported
		}</div>
		<div class="help" title="AudioBuffer.getChannelData()\nAudioBuffer.copyFromChannel()\nAudioBuffer.copyToChannel">trap: ${
			!noise ? audioTrap : getDiffs({
				stringA: audioTrap,
				stringB: noise,
				charDiff: true,
				decorate: diff => `<span class="bold-fail">${diff}</span>`
			})
		}</div>
		<div>unique: ${totalUniqueSamples}</div>
		<div class="help" title="AudioBuffer.getChannelData()">data:${
			''+binsSample[0] == 'undefined' ? ` ${note.unsupported}` : 
			`<span class="sub-hash">${hashMini(binsSample)}</span>`
		}</div>
		<div class="help" title="AudioBuffer.copyFromChannel()">copy:${
			''+copySample[0] == 'undefined' ? ` ${note.unsupported}` : 
			`<span class="sub-hash">${hashMini(copySample)}</span>`
		}</div>
		<div>values: ${
			modal(
				'creep-offline-audio-context',
				Object.keys(values).map(key => `<div>${key}: ${values[key]}</div>`).join(''),
				hashMini(values)
			)
		}</div>
	</div>
	`
}
