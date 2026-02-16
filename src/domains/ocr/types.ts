export interface ImageAnalysisResult {
    blurScore: number // 0-100, higher is clearer
    isBlurry: boolean
    textDensity: number // 0-1 (percentage of area covered by edges/text)
    dominantLanguage: 'cjk' | 'latin' | 'mixed' | 'unknown'
    confidence: number
}

export interface ImageAnalysisConfig {
    blurThreshold: number // Default: 60
    sampleRate: number // Default: 0.1 (10% for quick sampling)
}

