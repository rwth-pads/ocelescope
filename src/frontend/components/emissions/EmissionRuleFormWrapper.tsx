/* eslint-disable react-hooks/exhaustive-deps */
import { E2OEmissionRule_Input, EventEmissionRule_Input } from "@/src/api/generated";
import { EditingEmissionRule, getEmissionRuleDisplayName, isEmissionRuleEmpty } from "@/src/emissions.types";
import { Api } from "@/src/openapi";
import { useOceanStore } from "@/src/zustand";
import { useEffect, useState } from "react";
import Accordion from "react-bootstrap/Accordion";
import Form from "react-bootstrap/Form";
import { FaTrash, FaTriangleExclamation } from "react-icons/fa6";
import styled from "styled-components";
import EmissionRuleForm from "./EmissionRuleForm";

export type EmissionRuleFormWrapperProps = {
  initialRule: EditingEmissionRule
  saveRule: (er: EditingEmissionRule | null, prev?: EditingEmissionRule) => void
}

const EmissionRuleFormWrapper: React.FC<EmissionRuleFormWrapperProps> = ({
  initialRule,
  saveRule
}) => {
  const index = initialRule.index
  const session = useOceanStore.use.session()
  const [rule, setRule] = useState<EditingEmissionRule>({ ...initialRule })
  const [isValid, setIsValid] = useState(true)

  useEffect(() => {
    async function effect() {
      if (!isEmissionRuleEmpty(rule) && session) {
        saveRule(rule)

        // validate rule on server to get display name
        try {
          const res = await Api.validateEmissionRuleValidateEmissionRulePost({
            oceanSessionId: session,
            requestBody: {
              rule: rule as unknown as (EventEmissionRule_Input | E2OEmissionRule_Input)
            }
          })
          setIsValid(true)
          const defaultName = res.rule.defaultName
          if (!rule.name) {
            setDisplayName(defaultName)
          }
        } catch (err) {
          setIsValid(false)
        }
      } else setIsValid(false)
    }
    effect()
  }, [rule])

  const deleteRule = () => {
    saveRule(null, rule)
  }

  const getId = (field: string) => `emissionRuleForm${index}.${field}`

  const [isRenaming, setIsRenaming] = useState<boolean>(false)
  const [displayName, setDisplayName] = useState<string>()
  useEffect(() => setDisplayName(getEmissionRuleDisplayName(rule)), [rule])

  return (
    <Accordion.Item eventKey={index.toString()}>
      <AccordionHeader>
        {!isValid && <FaTriangleExclamation className="text-warning me-1" />}
        {!isRenaming && <span className="me-auto rule-name" onClick={e => {
          setIsRenaming(true)
          e.stopPropagation()
        }}>{displayName}</span>}
        {isRenaming && <Form.Control
          autoFocus
          defaultValue={displayName}
          onKeyDownCapture={e => {
            if (e.key == "Escape") {
              setIsRenaming(false)
            }
          }}
          onBlur={e => {
            const renamingValue = e.target.value
            if (renamingValue.length == 0) {
              // Remove custom name, use auto-generated name again
              setRule(({ ...rule, name: undefined }))
            } else if (renamingValue != displayName) {
              // Only save the name if different from last auto-generated displayName
              setRule(({ ...rule, name: renamingValue }))
            }
            setIsRenaming(false)
          }}
          onClick={e => {
            e.stopPropagation()
          }}
          onKeyDown={e => {
            if (e.key === "Enter") {
              (e.target as HTMLInputElement).blur()
            }
          }}
        />}
        <DeleteIcon onClick={e => {
          e.stopPropagation()
          deleteRule()
        }} />
      </AccordionHeader>
      <Accordion.Body>

        <Form onSubmit={e => { e.preventDefault() }}>
          <EmissionRuleForm
            index={index}
            rule={rule}
            setRule={setRule}
            getId={getId}
          />
        </Form>

      </Accordion.Body>
    </Accordion.Item>
  )
}

const AccordionHeader = styled(Accordion.Header)`
  ::after { // accordion toggle icon
    margin-left: .5rem !important;
  }
  .accordion-button {
    
    .rule-name {
      margin: -.25rem;
      padding: .25rem;
      font-size: .9em;
    }
    &.collapsed {

      .rule-name {
        &:hover {
          box-shadow: 0 0 0 1px var(--bs-light-border-subtle);
          background: var(--bs-light-bg-subtle);
          /* border: 1px solid var(--bs-border-color); */
        }
      }
    }
    &:not(.collapsed) {
      .rule-name {
        &:hover {
          box-shadow: 0 0 0 1px var(--bs-primary-border-subtle);
          background: var(--bs-primary-bg-subtle);
          /* border: 1px solid var(--bs-border-color); */
        }
      }
    }
  }

`
const DeleteIcon = styled(FaTrash)`
  cursor: pointer;
  color: var(--bs-secondary);
  &:hover {
    color: var(--bs-danger);
  }
`

export default EmissionRuleFormWrapper
