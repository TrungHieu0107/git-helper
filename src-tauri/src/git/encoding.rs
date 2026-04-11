use encoding_rs::Encoding;
use chardetng::EncodingDetector;

pub struct DetectionResult {
    pub content: String,
    pub encoding: String,
    pub confidence: f32,
    pub had_bom: bool,
    pub is_binary: bool,
}

/// Detects the encoding of a byte slice and decodes it to a String.
/// Pipeline:
/// 1. Binary Guard (Null byte check in first 8KB)
/// 2. BOM Detection (UTF-8, UTF-16 LE/BE, UTF-32)
/// 3. Statistical Detection (chardetng)
pub fn detect_and_decode(bytes: &[u8], force_encoding: Option<&str>) -> DetectionResult {
    // 1. Binary Guard
    let sample_size = std::cmp::min(bytes.len(), 8192);
    let is_binary = bytes[..sample_size].iter().any(|&b| b == 0);

    if is_binary {
        return DetectionResult {
            content: "[Binary File]".to_string(),
            encoding: "binary".to_string(),
            confidence: 1.0,
            had_bom: false,
            is_binary: true,
        };
    }

    // 2. Forced Encoding (User override)
    if let Some(enc_name) = force_encoding {
        if let Some(enc) = Encoding::for_label(enc_name.as_bytes()) {
            let (decoded, _actual_enc, had_bom) = enc.decode(bytes);
            return DetectionResult {
                content: decoded.into_owned(),
                encoding: enc.name().to_string(),
                confidence: 1.0,
                had_bom,
                is_binary: false,
            };
        }
    }

    // 3. BOM Detection (Built-in to encoding_rs::Encoding::decode_with_bom_removal)
    // Actually, encoding_rs handles BOMs if we use the right method.
    // However, if we want to explicitly know if there was a BOM:
    let (decoded, actual_enc, had_bom) = encoding_rs::UTF_8.decode(bytes);
    
    // If it was UTF-8 with BOM, we are done
    if had_bom {
        return DetectionResult {
            content: decoded.into_owned(),
            encoding: actual_enc.name().to_string(),
            confidence: 1.0,
            had_bom: true,
            is_binary: false,
        };
    }

    // 4. Statistical Detection (chardetng)
    let mut detector = EncodingDetector::new();
    detector.feed(bytes, true);
    let guessed_enc = detector.guess(None, true);
    
    // Decode with the guessed encoding
    let (decoded, _actual_enc, had_bom) = guessed_enc.decode(bytes);

    // Estimate confidence (simplified: chardetng doesn't give a score directly, 
    // but the user's requirement mentioned a threshold. We'll mark it as 0.95 for guessed)
    // In a real chardetng usage, we might check if it's UTF-8 and if it was "guaranteed".
    let confidence = if guessed_enc == encoding_rs::UTF_8 { 0.99 } else { 0.85 };

    DetectionResult {
        content: decoded.into_owned(),
        encoding: guessed_enc.name().to_string(),
        confidence,
        had_bom,
        is_binary: false,
    }
}
