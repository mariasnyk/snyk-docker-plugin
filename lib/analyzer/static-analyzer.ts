import * as Debug from "debug";
import { getDockerArchiveLayersAndManifest } from "../extractor";
import {
  getApkDbFileContent,
  getApkDbFileContentAction,
} from "../inputs/apk/static";
import {
  getAptDbFileContent,
  getDpkgFileContentAction,
  getExtFileContentAction,
} from "../inputs/apt/static";
import {
  getBinariesHashes,
  getNodeBinariesFileContentAction,
} from "../inputs/binaries/static";
import { getOsReleaseActions } from "../inputs/os-release/static";
import {
  getRpmDbFileContent,
  getRpmDbFileContentAction,
} from "../inputs/rpm/static";
import { ImageType, StaticAnalysisOptions } from "../types";
import * as osReleaseDetector from "./os-release";
import { analyze as apkAnalyze } from "./package-managers/apk";
import { analyze as aptAnalyze } from "./package-managers/apt";
import { analyze as rpmAnalyze } from "./package-managers/rpm";
import { ImageAnalysis, OSRelease, StaticAnalysis } from "./types";

const debug = Debug("snyk");

export async function analyze(
  targetImage: string,
  options: StaticAnalysisOptions,
): Promise<StaticAnalysis> {
  if (options.imageType !== ImageType.DockerArchive) {
    throw new Error("Unhandled image type");
  }

  const staticAnalysisActions = [
    getApkDbFileContentAction,
    getDpkgFileContentAction,
    getExtFileContentAction,
    getRpmDbFileContentAction,
    ...getOsReleaseActions,
    getNodeBinariesFileContentAction,
  ];

  const dockerArchive = await getDockerArchiveLayersAndManifest(
    options.imagePath,
    staticAnalysisActions,
  );

  const archiveLayers = dockerArchive.layers;

  const [
    apkDbFileContent,
    aptDbFileContent,
    rpmDbFileContent,
  ] = await Promise.all([
    getApkDbFileContent(archiveLayers),
    getAptDbFileContent(archiveLayers),
    getRpmDbFileContent(archiveLayers, options.tmpDirPath),
  ]);

  let osRelease: OSRelease;
  try {
    osRelease = await osReleaseDetector.detectStatically(archiveLayers);
  } catch (err) {
    debug(err);
    throw new Error("Failed to detect OS release");
  }

  let results: ImageAnalysis[];
  try {
    results = await Promise.all([
      apkAnalyze(targetImage, apkDbFileContent),
      aptAnalyze(targetImage, aptDbFileContent),
      rpmAnalyze(targetImage, rpmDbFileContent),
    ]);
  } catch (err) {
    debug(err);
    throw new Error("Failed to detect installed OS packages");
  }

  const imageId = targetImage;

  const binaries = getBinariesHashes(archiveLayers);

  return {
    imageId,
    osRelease,
    results,
    binaries,
    imageLayers: dockerArchive.manifest.Layers,
  };
}
