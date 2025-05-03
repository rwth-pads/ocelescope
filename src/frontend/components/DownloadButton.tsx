/* eslint-disable react-hooks/exhaustive-deps */

import { ReactNode, useCallback, useEffect, useMemo, useState } from "react";
import Button, { ButtonProps } from "react-bootstrap/Button";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import React from "react";
import _ from "lodash";
import { useLoadingText } from "./layout/Layout";

export type DownloadFile = {
  fileName: string;
} & (
  | {
      type: "json";
      data: any;
    }
  | {
      type: "server";
      contentType: string;
      path?: string;
      fetcher?: () => Promise<Blob>;
    }
);

const DownloadButton: React.FC<
  {
    files: DownloadFile[];
    zip?: boolean;
    zipName?: string;
    onDownload?: () => void;
  } & Omit<ButtonProps, "onClick">
> = ({
  files,
  zip = false,
  disabled = false,
  zipName = "download.zip",
  onDownload,
  children,
  ...props
}) => {
  const setLoadingText = useLoadingText();

  if (!files.length) {
    disabled = true;
  }

  zip = zip || files.length > 1;

  // const [fileContents, setFileContents] = useState<(Blob | string | undefined)[]>()
  // useEffect(() => {
  //   effect()

  //   async function effect() {
  //     // setFileContents()
  //   }
  // }, [files])

  const handleDownload = useCallback(async () => {
    if (disabled) return;

    const showLoadingMessage = files.some((file) => file.type == "server");
    if (showLoadingMessage) {
      setLoadingText("Preparing download");
    }

    // console.log("DownloadButton: prepare file contents")
    const fileContents = await Promise.all(
      files.map(async (file, i) => {
        // if (fileContents !== undefined && file.type == "server" && fileContents[i] !== undefined) {
        //   // Assume files on server are static. Re-render should not require re-fetching those files
        //   return fileContents[i]
        // }
        if (file.type == "json") {
          // Serialize data as JSON
          return JSON.stringify(file.data, null, 2);
        } else if (file.type == "server") {
          // Get file from server
          console.log(`fetch ${file.path ?? "file"}`);
          if (file.fetcher) {
            return await file.fetcher();
          } else if (file.path) {
            const response = await fetch(file.path);
            return await response.blob();
          } else {
            throw Error("File download source not specified");
          }
        }
        return undefined;
      }),
    );

    if (!fileContents.length) {
      return false;
    }

    if (zip) {
      const zipFile = new JSZip();
      files.forEach(async (file, i) => {
        const contents = fileContents[i];
        if (!contents) {
          return;
        }
        // Add file to zip
        zipFile.file(file.fileName, contents);
      });
      // Generate ZIP and trigger download
      const blob = await zipFile.generateAsync({ type: "blob" });
      saveAs(blob, zipName);
    } else {
      const file = files[0];
      let content = fileContents[0];
      if (!content) {
        return false;
      }
      if (file.type == "json") {
        content = new Blob([content], { type: "application/json" });
      } else if (file.type == "server") {
        console.log(`Single server file (type: ${typeof content})`);
        if (content instanceof Blob) {
          // Blob: keep content as-is
        } else if (typeof content === "string") {
          // string: save as Blob
          content = new Blob([content], { type: file.contentType });
        } else {
          throw Error("File download content has to be Blob or string");
        }
      }
      if (!(content instanceof Blob)) {
        throw Error("File download has to be Blob");
      }
      saveAs(content, file.fileName);
    }

    if (onDownload) {
      onDownload();
    }

    if (showLoadingMessage) {
      setLoadingText(null);
    }
  }, [files, zip]);

  return (
    <Button onClick={handleDownload} disabled={disabled} {...props}>
      {children}
    </Button>
  );
};
// }, (props1, props2) => {
//   const { files: prevFiles, ...prevProps } = props1
//   const { files: nextFiles, ...nextProps } = props2

//   if (prevFiles.length != nextFiles.length) {
//     return false
//   }
//   if (JSON.stringify(_.sortBy(prevFiles, file => file.fileName)) != JSON.stringify(_.sortBy(nextFiles, file => file.fileName))) {
//     return false
//   }
//   const nonFunctionProps = (props: any) => Object.fromEntries(Object.entries(props).filter(([k, v]) => typeof v !== "function"))
//   return JSON.stringify(nonFunctionProps(prevProps)) == JSON.stringify(nonFunctionProps(nextFiles))

// })

DownloadButton.displayName = "DownloadButton";
export default DownloadButton;
