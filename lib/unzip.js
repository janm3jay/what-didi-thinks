// Minimal zip reader for iPhone WhatsApp exports (a .zip holding _chat.txt).
// Uses the built-in DecompressionStream, so no library is needed.

function findEndOfCentralDirectory(view) {
  for (let i = view.byteLength - 22; i >= Math.max(0, view.byteLength - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) return i;
  }
  throw new Error("This doesn't look like a zip file.");
}

async function inflate(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export async function extractChatText(buffer) {
  const view = new DataView(buffer);
  const eocd = findEndOfCentralDirectory(view);
  const count = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();

  const entries = [];
  for (let n = 0; n < count; n++) {
    if (view.getUint32(offset, true) !== 0x02014b50) break;
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
    entries.push({ name, method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }

  const txt = entries.filter((e) => /\.txt$/i.test(e.name) && !e.name.startsWith("__MACOSX"));
  const entry = txt.find((e) => /_chat\.txt$/i.test(e.name)) || txt[0];
  if (!entry) throw new Error("No chat .txt file found inside the zip.");

  const local = entry.localOffset;
  const dataStart = local + 30 + view.getUint16(local + 26, true) + view.getUint16(local + 28, true);
  const data = new Uint8Array(buffer, dataStart, entry.compressedSize);
  if (entry.method === 0) return decoder.decode(data);
  if (entry.method === 8) return decoder.decode(await inflate(data));
  throw new Error("Unsupported zip compression.");
}
