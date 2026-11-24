// Builds one MP4 (H.264 video + AAC voice) from PNG frames and a WAV voice track.
import AVFoundation
import CoreGraphics
import ImageIO

let args = CommandLine.arguments
let framesDir = URL(fileURLWithPath: args[1])
let fps = Int32(args[2])!
let voiceURL = URL(fileURLWithPath: args[3])
let outURL = URL(fileURLWithPath: args[4])
let width = 1280, height = 800
try? FileManager.default.removeItem(at: outURL)

let writer = try AVAssetWriter(outputURL: outURL, fileType: .mp4)
let videoIn = AVAssetWriterInput(mediaType: .video, outputSettings: [
  AVVideoCodecKey: AVVideoCodecType.h264,
  AVVideoWidthKey: width, AVVideoHeightKey: height,
  AVVideoCompressionPropertiesKey: [
    AVVideoAverageBitRateKey: 550_000,
    AVVideoProfileLevelKey: AVVideoProfileLevelH264HighAutoLevel,
    AVVideoMaxKeyFrameIntervalKey: 50,
  ],
])
videoIn.expectsMediaDataInRealTime = false
let adaptor = AVAssetWriterInputPixelBufferAdaptor(assetWriterInput: videoIn, sourcePixelBufferAttributes: [
  kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_32BGRA,
  kCVPixelBufferWidthKey as String: width, kCVPixelBufferHeightKey as String: height,
])
let audioIn = AVAssetWriterInput(mediaType: .audio, outputSettings: [
  AVFormatIDKey: kAudioFormatMPEG4AAC, AVSampleRateKey: 22050,
  AVNumberOfChannelsKey: 1, AVEncoderBitRateKey: 64000,
])
audioIn.expectsMediaDataInRealTime = false
writer.add(videoIn); writer.add(audioIn)
writer.startWriting(); writer.startSession(atSourceTime: .zero)

let asset = AVURLAsset(url: voiceURL)
let track = asset.tracks(withMediaType: .audio).first!
let reader = try AVAssetReader(asset: asset)
let out = AVAssetReaderTrackOutput(track: track, outputSettings: [AVFormatIDKey: kAudioFormatLinearPCM])
reader.add(out); reader.startReading()
var samples: [CMSampleBuffer] = []
while let sample = out.copyNextSampleBuffer() { samples.append(sample) }
var nextSample = 0
// Audio up to `seconds`, so the writer always has both tracks to interleave.
func feedAudio(upTo seconds: Double) {
  while nextSample < samples.count,
    CMSampleBufferGetPresentationTimeStamp(samples[nextSample]).seconds <= seconds {
    while !audioIn.isReadyForMoreMediaData { usleep(1000) }
    audioIn.append(samples[nextSample]); nextSample += 1
  }
}

let files = try FileManager.default.contentsOfDirectory(atPath: framesDir.path).filter { $0.hasSuffix(".png") }.sorted()
for (i, name) in files.enumerated() {
  let src = CGImageSourceCreateWithURL(framesDir.appendingPathComponent(name) as CFURL, nil)!
  let image = CGImageSourceCreateImageAtIndex(src, 0, nil)!
  var buffer: CVPixelBuffer?
  CVPixelBufferPoolCreatePixelBuffer(nil, adaptor.pixelBufferPool!, &buffer)
  let pb = buffer!
  CVPixelBufferLockBaseAddress(pb, [])
  let ctx = CGContext(data: CVPixelBufferGetBaseAddress(pb), width: width, height: height, bitsPerComponent: 8,
    bytesPerRow: CVPixelBufferGetBytesPerRow(pb), space: CGColorSpaceCreateDeviceRGB(),
    bitmapInfo: CGImageAlphaInfo.premultipliedFirst.rawValue | CGBitmapInfo.byteOrder32Little.rawValue)!
  ctx.draw(image, in: CGRect(x: 0, y: 0, width: width, height: height))
  CVPixelBufferUnlockBaseAddress(pb, [])
  feedAudio(upTo: Double(i) / Double(fps) + 1)
  while !videoIn.isReadyForMoreMediaData { usleep(1000) }
  adaptor.append(pb, withPresentationTime: CMTime(value: CMTimeValue(i), timescale: fps))
}
videoIn.markAsFinished()
feedAudio(upTo: .infinity)
audioIn.markAsFinished()

let done = DispatchSemaphore(value: 0)
writer.finishWriting { done.signal() }
done.wait()
print(writer.status == .completed ? "done \(files.count) frames" : "failed: \(String(describing: writer.error))")
