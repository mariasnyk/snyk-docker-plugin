import { Elf } from "../../go-parser/types";
import { ScanResult } from "../../types";

export interface AppDepsScanResultWithoutTarget
  extends Omit<ScanResult, "target"> {}

export interface FilePathToContent {
  [filePath: string]: string;
}

export interface FilePathToElfContent {
  [filePath: string]: Elf;
}
