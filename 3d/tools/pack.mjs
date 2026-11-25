import { NodeIO } from '@gltf-transform/core'; import { ALL_EXTENSIONS } from '@gltf-transform/extensions'; import { resample, prune, dedup, textureCompress, meshopt, weld, quantize } from '@gltf-transform/functions'; import { MeshoptEncoder } from 'meshoptimizer'; import sharp from 'sharp';
await MeshoptEncoder.ready; const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const [inp, out, size] = process.argv.slice(2); const d = await io.read(inp);
await d.transform(dedup(), resample(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [+size || 1024, +size || 1024], quality: 82 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(out, d); console.log(out.split('/').pop(), (await import('node:fs')).statSync(out).size);
