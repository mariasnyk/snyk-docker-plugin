import { GoPackage } from "./types";

/**
 * Because 3rd party imports in Go look like URLs (github.com/bla/bla)
 * we try to match lines that have URL-like type of string and ends with `..inittask` string
 * `.inittask` is internal Go mechanism to initialize modules
 */
const INIT_TASK_LINE_REGEXP = /^\w+\.\w+\/.+\.\.inittask$/;

/**
 * Get all lines in `.strtab` that ends with `..inittask`
 * `..inittask` is internal go function to init the package
 * Also lines need to be decoded, cos it might contain HTML encoded symbols
 * @param strTabSectionBuffer
 */
export function parserStrTab(strTabSectionBuffer: Buffer): GoPackage[] {
  return (
    strTabSectionBuffer
      .toString()
      // Lines in a strTab are terminated by \u0000 (NULL) symbol
      .split("\0")
      // Get only lines that look like go packages
      .filter((line) => line.match(INIT_TASK_LINE_REGEXP))
      // Remove trailing `..inittask` from go package
      .map((line) => decodeURIComponent(line.replace("..inittask", "")))
  );
}
