import * as gunzip from "gunzip-maybe";
import * as path from "path";
import { Readable } from "stream";
import { extract, Extract } from "tar-stream";
import { applyCallbacks, isResultEmpty } from "./callbacks";
import { ExtractAction, ExtractedLayers } from "./types";

/**
 * Extract key files from the specified TAR stream.
 * @param layerTarStream image layer as a Readable TAR stream. Note: consumes the stream.
 * @param extractActions array of pattern, callbacks pairs
 * @returns extracted file products
 */
export async function extractImageLayer(
  layerTarStream: Readable,
  extractActions: ExtractAction[],
): Promise<ExtractedLayers> {
  return new Promise((resolve, reject) => {
    const result: ExtractedLayers = {};
    const tarExtractor: Extract = extract();

    tarExtractor.on("entry", async (headers, stream, next) => {
      if (headers.type === "file") {
        const absoluteFileName = path.join(path.sep, headers.name);
        const matchedActions = extractActions.filter((action) =>
          action.filePathMatches(absoluteFileName),
        );
        if (matchedActions.length > 0) {
          const callbackResult = await applyCallbacks(
            matchedActions,
            stream,
            headers.size,
          );

          if (!isResultEmpty(callbackResult)) {
            result[absoluteFileName] = callbackResult;
          }
        }
      }

      stream.resume(); // auto drain the stream
      next(); // ready for next entry
    });

    tarExtractor.on("finish", () => {
      // all layer level entries read
      resolve(result);
    });

    tarExtractor.on("error", (error) => reject(error));

    layerTarStream.pipe(gunzip()).pipe(tarExtractor);
  });
}
