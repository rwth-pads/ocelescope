import {
  ClimatiqConfig,
  climatiqDataVersionRequest,
  validateClimatiqApiKey,
} from "@/src/climatiq.types";
import { useOceanStore } from "@/src/zustand";
import Image, { ImageProps } from "next/image";
import { useState } from "react";
import { Button, Col, Form, Modal, Row } from "react-bootstrap";

export type ClimatiqSettingsModalProps = {};

const ClimatiqSettingsModal: React.FC<ClimatiqSettingsModalProps> = ({}) => {
  const { climatiqConfig, setClimatiqConfig } =
    useOceanStore.useState.climatiqConfig();
  const { isClimatiqSettingsOpen, setIsClimatiqSettingsOpen } =
    useOceanStore.useState.isClimatiqSettingsOpen();
  const [dataVersionInput, setDataVersionInput] = useState(
    climatiqConfig.dataVersion?.toString() ?? "",
  );
  const [apiKeyError, setApiKeyError] = useState(false);
  const [dataVersionError, setDataVersionError] = useState(false);
  const [isApiKeyValid, setIsApiKeyValid] = useState(false);

  const setApiKey = async (apiKey: string) => {
    const newConfig: ClimatiqConfig = {
      ...climatiqConfig,
      apiKey: apiKey,
    };
    try {
      newConfig.apiKey = validateClimatiqApiKey(newConfig);
    } catch (err) {
      newConfig.apiKey = undefined;
    }
    console.log("new climatiq config", newConfig);
    if (newConfig.apiKey) {
      // run data version request to test api key
      const latestDataVersion = await climatiqDataVersionRequest(newConfig);
      setApiKeyError(latestDataVersion === false);
      setIsApiKeyValid(latestDataVersion !== false);
      setClimatiqConfig(newConfig);
    } else {
      setApiKeyError(true);
      setIsApiKeyValid(false);
    }
  };

  const setDataVersion = (dataVersionInput: string) => {
    try {
      const dataVersion = Number.parseInt(dataVersionInput);
      setDataVersionError(false);
      setClimatiqConfig({
        ...climatiqConfig,
        dataVersion: dataVersion,
      });
    } catch (err) {
      setDataVersionError(true);
    }
  };

  const setLatestDataVersion = async () => {
    const latestDataVersion = await climatiqDataVersionRequest(climatiqConfig);
    setApiKeyError(latestDataVersion === false);
    setIsApiKeyValid(latestDataVersion !== false);
    if (latestDataVersion !== false) {
      setClimatiqConfig({
        ...climatiqConfig,
        dataVersion: latestDataVersion,
      });
      setDataVersionInput(latestDataVersion.toString());
    }
  };

  return (
    <Modal
      show={isClimatiqSettingsOpen}
      size="lg"
      fullscreen="xs-down"
      onHide={() => setIsClimatiqSettingsOpen(false)}
    >
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <a
            href="https://climatiq.io"
            target="_blank"
            title="Climatiq website"
          >
            <ClimatiqLogoIcon />
          </a>
          Climatiq Config
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Group
          as={Row}
          className="mb-2"
          controlId="climatiq-config-api-key"
        >
          <Form.Label column sm={2} className="d-none d-sm-block">
            API key
          </Form.Label>
          <Col sm={10}>
            <Form.Control
              type="password"
              className="font-monospace"
              disabled={process.env.NEXT_PUBLIC_CLIMATIQ_API_KEY !== undefined}
              isInvalid={apiKeyError}
              isValid={isApiKeyValid}
              placeholder="API key"
              defaultValue={climatiqConfig.apiKey}
              onChange={() => setApiKeyError(false)}
              onBlur={(e) => setApiKey(e.target.value)}
            />
          </Col>
        </Form.Group>
        <Form.Group
          as={Row}
          className="mb-2 align-items-center"
          controlId="climatiq-config-data-version"
        >
          <Form.Label column sm={2} className="d-none d-sm-block">
            Data version
          </Form.Label>
          <Col sm={10} className="d-flex">
            <Form.Control
              disabled={
                process.env.NEXT_PUBLIC_CLIMATIQ_DATA_VERSION !== undefined
              }
              isInvalid={dataVersionError}
              placeholder="Data version"
              value={dataVersionInput}
              onChange={(e) => {
                setDataVersionInput(e.target.value);
                setDataVersionError(false);
              }}
              onBlur={async (e) => setDataVersion(e.target.value)}
            />
            <Button
              disabled={
                process.env.NEXT_PUBLIC_CLIMATIQ_DATA_VERSION !== undefined
              }
              className="ms-2"
              variant="primary"
              onClick={() => setLatestDataVersion()}
            >
              Latest
            </Button>
          </Col>
        </Form.Group>
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={() => setIsClimatiqSettingsOpen(false)}
        >
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const ClimatiqLogoIcon: React.FC<
  Omit<ImageProps, "src" | "alt"> & {
    disabled?: boolean;
    variant?: "color" | "white";
  }
> = ({ disabled = false, variant = "color", style, ...props }) => {
  const size = 30;
  const src =
    variant == "white"
      ? "/app/Climatiq_Icon_white.png"
      : "/app/Climatiq_Icon.png";

  return (
    <Image
      src={src}
      alt="Climatiq Logo"
      width={size}
      height={size}
      style={{
        width: "1em",
        height: "1em",
        display: "block",
        ...(disabled ? { filter: "grayscale(.6)" } : {}),
        ...style,
      }}
      {...props}
    />
  );
};

export default ClimatiqSettingsModal;
