import { Readable } from "stream";

/**
 * Consume the data from the specified stream into a string
 * @param stream stream to cosume the data from
 * @param encoding encoding to use for convertinf the data to string, default "utf8"
 * @returns string with the data consumed from the specified stream
 */
export async function streamToString(
  stream: Readable,
  encoding: string = "utf8",
): Promise<string> {
  const chunks: string[] = [];
  return new Promise((resolve, reject) => {
    stream.on("end", () => {
      resolve(chunks.join(""));
    });
    stream.on("error", (error) => reject(error));
    stream.on("data", (chunk) => {
      chunks.push(chunk.toString(encoding));
    });
  });
}
