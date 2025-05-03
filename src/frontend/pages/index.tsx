/* eslint-disable react-hooks/exhaustive-deps */
// pages/index.tsx
"use client";

import React, { ChangeEvent, useState } from "react";
import Button from "react-bootstrap/Button";
import Form from "react-bootstrap/Form";

import "bootstrap/dist/css/bootstrap.min.css";
import _ from "lodash";
import { FaCircleInfo, FaFileLines } from "react-icons/fa6";

import { defaultOcelIcons } from "@/src/ocel.types";

import { ParagraphLinks, SkeletonIcon } from "@/components/misc";
import Skeleton, { SkeletonTheme } from "react-loading-skeleton";
import "react-loading-skeleton/dist/skeleton.css";
import {
  useGetDefaultOcel,
  useImportDefaultOcel,
  useImportOcel,
} from "@/api/fastapi/default/default";
import FileUpload from "@/components/forms/FileUpload";

const StartPage: React.FC = () => {
  const { data: defaultOcels } = useGetDefaultOcel(
    { only_latest_versions: true },
    {},
  );
  const { mutate: importDefaultOcel } = useImportDefaultOcel({
    fetch: { credentials: "include" },
  });

  const { mutate: importOcel } = useImportOcel({
    fetch: { credentials: "include" },
  });
  const [uploadedOcel, setUploadedOcel] = useState<File>();

  return (
    <>
      <h4>OCEL 2.0 Import</h4>
      <div className="mb-5">
        <Form.Group controlId="formFile" className="mb-3">
          <Form.Label>
            Select an event log (<code>.sqlite</code> OCEL 2.0 format) from your
            local disk
          </Form.Label>
          <FileUpload
            accept=".sqlite"
            onUpload={(file) => setUploadedOcel(file)}
          />
        </Form.Group>
        <Button
          onClick={() => {
            if (uploadedOcel)
              importOcel({
                data: { file: uploadedOcel },
                params: { name: uploadedOcel.name },
              });
          }}
        >
          Import
        </Button>
      </div>

      <h4>Use default OCELs</h4>
      <div className="mb-5">
        <SkeletonTheme>
          <ParagraphLinks>
            {!defaultOcels
              ? _.range(3).map((i) => (
                  <p key={i} className="disabled">
                    <SkeletonIcon />
                    <Skeleton count={1} width={200} />
                  </p>
                ))
              : defaultOcels.map(({ key, name, version, url }, i) => {
                  const Icon = _.get(defaultOcelIcons, key, FaFileLines);
                  return (
                    <div key={i}>
                      <Icon className="text-secondary" />
                      <a
                        className="stretched-link d-flex align-items-center me-auto"
                        onClick={(e) => {
                          importDefaultOcel({ params: { key } });
                        }}
                      >
                        {name}
                      </a>
                      {!!url && (
                        <div>
                          <a
                            className="text-secondary"
                            href={url}
                            onClick={(e) => {
                              e.stopPropagation();
                            }}
                            target="_blank"
                            style={{ position: "relative", zIndex: 2 }}
                          >
                            <FaCircleInfo />
                          </a>
                        </div>
                      )}
                      {!!version && (
                        <span className="text-secondary">
                          {versionString(version)}
                        </span>
                      )}
                    </div>
                  );
                })}
          </ParagraphLinks>
        </SkeletonTheme>
      </div>
    </>
  );
};

export default StartPage;

export const versionString = (v: string) => {
  let v1 = v.toLowerCase().trim();
  if (v1.startsWith("version")) v1 = v1.substring("version".length).trim();
  if (v1.startsWith("v")) v1 = v1.substring(1).trim();

  if (v1.match(/^\d(?:\.\d+)*$/)) return `V${v1}`;
  return v;
};
