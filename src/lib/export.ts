// Helpers for exporting search results as a zip of card images.
import { Zip, ZipPassThrough } from 'fflate';
import { getCardById, getImageSrc } from '@/lib/api';
import { Card } from '@/types/types';

// Large pages keep most exports to a single request, which also avoids
// items shifting between pages when the sort order has ties.
const EXPORT_PAGE_SIZE = 500;

// How many images to download at once.
const IMAGE_CONCURRENCY = 6;

// Custom card renders are ~5 MB each, so a full export can reach several GB. The zip is built
// in memory, so large exports are split into parts that are saved (and freed) as they fill up.
const MAX_ZIP_PART_BYTES = 500 * 1024 * 1024;

/**
 * Fetch every page of a paginated list endpoint and return all items.
 * Throws if the server returns a different number of items than the total it reported.
 */
export async function fetchAllPages<T>(
  fetchPage: (page: number, limit: number) => Promise<{ items: T[]; total: number }>
): Promise<T[]> {
  const first = await fetchPage(1, EXPORT_PAGE_SIZE);
  const items = [...first.items];

  for (let page = 2; items.length < first.total; page++) {
    const next = await fetchPage(page, EXPORT_PAGE_SIZE);
    if (next.items.length === 0) break;
    items.push(...next.items);
  }

  if (items.length !== first.total) {
    throw new Error(`Received ${items.length} of ${first.total} results.`);
  }

  return items;
}

/**
 * Double-faced cards keep their back face as a separate facedown card, which never
 * shows up in search results. Insert each hidden back face right after its front face.
 */
export async function withBackFaces(cards: Card[]): Promise<Card[]> {
  const relatedNames = (card: Card) =>
    !card.relatedFace ? [] : Array.isArray(card.relatedFace) ? card.relatedFace : [card.relatedFace];

  const inResults = new Set(cards.map(card => card.name));
  const toLookUp = Array.from(
    new Set(cards.flatMap(relatedNames).filter(name => !inResults.has(name)))
  );

  const found = new Map<string, Card>();
  await Promise.all(
    toLookUp.map(async name => {
      try {
        const card = await getCardById(name);
        // Only hidden back faces; other related cards are listed (or filtered out) on their own
        if (card.facedown) found.set(name, card);
      } catch (err) {
        console.warn(`Could not look up related face "${name}":`, err);
      }
    })
  );

  const added = new Set<string>();
  const result: Card[] = [];
  for (const card of cards) {
    result.push(card);
    for (const name of relatedNames(card)) {
      const back = found.get(name);
      if (back && !added.has(name)) {
        added.add(name);
        result.push(back);
      }
    }
  }
  return result;
}

const EXTENSIONS: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};

// Identify the format from the file's first bytes; URLs and content types aren't reliable
// (e.g. a ".bmp" asset that is really a PNG, served as application/octet-stream).
function sniffExtension(data: Uint8Array): string | undefined {
  const startsWith = (...bytes: number[]) => bytes.every((b, i) => data[i] === b);
  if (startsWith(0x89, 0x50, 0x4e, 0x47)) return 'png';
  if (startsWith(0xff, 0xd8, 0xff)) return 'jpg';
  if (startsWith(0x47, 0x49, 0x46, 0x38)) return 'gif';
  if (startsWith(0x52, 0x49, 0x46, 0x46) && data[8] === 0x57 && data[9] === 0x45 && data[10] === 0x42 && data[11] === 0x50) return 'webp';
  if (startsWith(0x42, 0x4d)) return 'bmp';
  return undefined;
}

function urlExtension(url: string): string | undefined {
  if (url.startsWith('data:')) return undefined;
  const match = url.split(/[?#]/)[0].match(/\.([a-z0-9]{2,5})$/i);
  return match?.[1].toLowerCase();
}

// Card names can contain characters that file systems reject ("A // B", "2/1 Human token", "Who?").
function toFileBaseName(name: string): string {
  const cleaned = name
    .replace(/\s*\/\/\s*/g, ' - ')
    .replace(/[/\\]/g, '-')
    .replace(/[<>:"|?*\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[. ]+$/, '');
  return cleaned || 'card';
}

async function fetchImage(url: string): Promise<{ data: Uint8Array; ext: string }> {
  const response = await fetch(getImageSrc(url));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const contentType = (response.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  const sourceExt = urlExtension(url);

  // The image proxy answers failed upstream fetches with a placeholder SVG and status 200
  if (contentType === 'image/svg+xml' && sourceExt !== 'svg') {
    throw new Error('image not available');
  }
  // GitHub release assets are served as application/octet-stream
  if (contentType && !contentType.startsWith('image/') && contentType !== 'application/octet-stream') {
    throw new Error(`unexpected content type ${contentType}`);
  }

  const data = new Uint8Array(await response.arrayBuffer());
  return { data, ext: sniffExtension(data) || EXTENSIONS[contentType] || sourceExt || 'png' };
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<void>
) {
  let next = 0;
  const runners = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      await worker(items[index], index);
    }
  });
  await Promise.all(runners);
}

function saveFile(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoke later: some browsers start reading the blob after click() returns
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

function localDate() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export interface ImageExportResult {
  saved: number;
  failed: string[];
  zipFiles: number;
}

// One zip file being built in memory. Images are already compressed, so files are stored as-is.
class ZipPart {
  bytes = 0;
  files = 0;
  private archive: Zip;
  private blob: Promise<Blob>;

  constructor() {
    let archive!: Zip;
    this.blob = new Promise<Blob>((resolve, reject) => {
      let chunks: Uint8Array[] = [];
      archive = new Zip((err, chunk, final) => {
        if (err) return reject(err);
        chunks.push(chunk);
        if (final) {
          resolve(new Blob(chunks, { type: 'application/zip' }));
          chunks = [];
        }
      });
    });
    this.archive = archive;
  }

  add(fileName: string, data: Uint8Array) {
    const file = new ZipPassThrough(fileName);
    this.archive.add(file);
    file.push(data, true);
    this.bytes += data.length;
    this.files++;
  }

  finish(): Promise<Blob> {
    this.archive.end();
    return this.blob;
  }
}

/**
 * Download each entry's image and save them as a zip, with files named after the entries.
 * Large exports are split into several zips of up to MAX_ZIP_PART_BYTES each.
 * Images that can't be downloaded are listed in missing-images.txt inside the (last) zip.
 */
export async function downloadImagesAsZip(
  entries: { name: string; imageUrl?: string | null }[],
  filePrefix: string,
  onProgress?: (done: number, total: number) => void
): Promise<ImageExportResult> {
  // Assign file names up front so duplicates are numbered in result order
  // (compared case-insensitively for Windows and macOS file systems)
  const seen = new Map<string, number>();
  const baseNames = entries.map(entry => {
    const base = toFileBaseName(entry.name);
    const count = (seen.get(base.toLowerCase()) || 0) + 1;
    seen.set(base.toLowerCase(), count);
    return count === 1 ? base : `${base} (${count})`;
  });

  const date = localDate();
  let part = new ZipPart();
  let partNumber = 1;
  const saves: Promise<void>[] = [];

  const addFile = (fileName: string, data: Uint8Array) => {
    // Save the current part and start a new one when this file would push it past the limit
    if (part.files > 0 && part.bytes + data.length > MAX_ZIP_PART_BYTES) {
      const full = part;
      const fullName = `${filePrefix}-${date}-part${partNumber}.zip`;
      part = new ZipPart();
      partNumber++;
      saves.push(full.finish().then(blob => saveFile(blob, fullName)));
    }
    part.add(fileName, data);
  };

  const failures: { index: number; reason: string }[] = [];
  let done = 0;
  onProgress?.(0, entries.length);

  await runWithConcurrency(entries, IMAGE_CONCURRENCY, async (entry, index) => {
    try {
      if (!entry.imageUrl) throw new Error('no image');
      const { data, ext } = await fetchImage(entry.imageUrl);
      addFile(`${baseNames[index]}.${ext}`, data);
    } catch (err) {
      failures.push({ index, reason: err instanceof Error ? err.message : String(err) });
    } finally {
      done++;
      onProgress?.(done, entries.length);
    }
  });

  if (failures.length === entries.length) {
    throw new Error('None of the images could be downloaded.');
  }

  failures.sort((a, b) => a.index - b.index);
  const failed = failures.map(f => entries[f.index].name);
  if (failures.length > 0) {
    const lines = failures.map(f => `${entries[f.index].name} (${f.reason})`);
    part.add('missing-images.txt', new TextEncoder().encode(lines.join('\n') + '\n'));
  }

  const lastName = partNumber === 1
    ? `${filePrefix}-${date}.zip`
    : `${filePrefix}-${date}-part${partNumber}.zip`;
  saves.push(part.finish().then(blob => saveFile(blob, lastName)));
  await Promise.all(saves);

  return { saved: entries.length - failures.length, failed, zipFiles: partNumber };
}

/** Short status line describing an export result, for showing under the button. */
export function describeImageExport({ saved, failed, zipFiles }: ImageExportResult): string {
  let message = zipFiles > 1
    ? `Saved ${saved} images in ${zipFiles} zip files (split because of their size).`
    : `Saved ${saved} images.`;
  if (failed.length > 0) {
    message += ` ${failed.length} couldn't be downloaded; they're listed in missing-images.txt in ${zipFiles > 1 ? 'the last zip' : 'the zip'}.`;
  }
  return message;
}
