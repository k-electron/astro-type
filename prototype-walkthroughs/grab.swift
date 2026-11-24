import AVFoundation
import ImageIO
import UniformTypeIdentifiers
let a = CommandLine.arguments
let gen = AVAssetImageGenerator(asset: AVURLAsset(url: URL(fileURLWithPath: a[1])))
gen.requestedTimeToleranceBefore = .zero; gen.requestedTimeToleranceAfter = .zero
let img = try gen.copyCGImage(at: CMTime(seconds: Double(a[2])!, preferredTimescale: 600), actualTime: nil)
let dest = CGImageDestinationCreateWithURL(URL(fileURLWithPath: a[3]) as CFURL, UTType.png.identifier as CFString, 1, nil)!
CGImageDestinationAddImage(dest, img, nil); CGImageDestinationFinalize(dest)
print("ok")
