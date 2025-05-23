
import React, { useState } from 'react';
import { ElementDefinition } from 'cytoscape';
import { OCNetModel } from '@/api/fastapi-schemas';
import { usePetriNet } from '@/api/fastapi/berti/berti';
import CytoscapeGraph from '@/components/Cytoscape/Cytoscape';
import { MultiSelect, Skeleton, Stack } from '@mantine/core';
import { useEventCounts, useObjectCount } from '@/api/fastapi/info/info';
import { RouteDefinition } from '@/plugins/types';

// Utility to generate a safe class name
const slugify = (str: string) =>
  str.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');

function generateColorMap(objectTypes: string[]): Record<string, string> {
  const palette = [
    '#3498db', '#e67e22', '#2ecc71', '#9b59b6',
    '#f39c12', '#1abc9c', '#e74c3c', '#7f8c8d',
  ];

  const colorMap: Record<string, string> = {};
  objectTypes.forEach((type, i) => {
    const className = `type-${slugify(type)}`;
    colorMap[className] = palette[i % palette.length];
  });

  return colorMap;
}

const generateStylesheet = (colorMap: Record<string, string>) => {
  const base = [
    {
      selector: 'node.place',
      style: {
        shape: 'ellipse',
        width: 40,
        height: 40,
        label: 'data(label)',
        'text-valign': 'center',
        'text-halign': 'center',
        'font-size': 10,
        'background-color': '#bdc3c7',
      },
    },
    {
      selector: 'node.transition',
      style: {
        shape: 'rectangle',
        width: 10,
        height: 40,
        label: 'data(label)',
        'font-size': 8,
        'text-valign': 'center',
        'text-halign': 'center',
      },
    },
    {
      selector: 'node.shared',
      style: {
        'background-color': '#666',
        'color': '#fff',
        'width': 120,
        'height': 50,
        'font-size': 10,
        'text-wrap': 'wrap',
      },
    },
    {
      selector: 'edge',
      style: {
        width: 1.5,
        'line-color': '#aaa',
        'target-arrow-shape': 'triangle',
        'target-arrow-color': '#aaa',
        'curve-style': 'bezier',
      },
    },
  ];

  const dynamicStyles = Object.entries(colorMap).flatMap(([className, color]) => [
    {
      selector: `node.${className}`,
      style: {
        'background-color': color,
      },
    },
    {
      selector: `edge.${className}`,
      style: {
        'line-color': color,
        'target-arrow-color': color,
      },
    },
  ]);

  return [...base, ...dynamicStyles];
}

const ocnetToElements = (model: OCNetModel, colorMap: Record<string, string>): ElementDefinition[] => {
  const elements: ElementDefinition[] = [];
  const sharedTransitions = new Map<string, string>(); // label -> ID
  const usedSharedLabels = new Set<string>();

  for (const [objectType, net] of Object.entries(model.objects)) {
    const colorClass = `type-${slugify(objectType)}`;

    // Places
    for (const place of net.places) {
      const id = `${objectType}__${place}`;
      const label = objectType;

      elements.push({
        data: { id, label },
        classes: `place ${colorClass}`,
      });
    }

    // Transitions
    for (const t of net.transitions) {
      const isShared = !!t.label;
      const sharedId = t.label ? `shared__${slugify(t.label)}` : '';
      const id = isShared ? sharedId : `${objectType}__${t.id}`;
      const label = t.label ?? '';

      if (isShared && !usedSharedLabels.has(t.label!)) {
        usedSharedLabels.add(t.label!);
        sharedTransitions.set(t.label!, sharedId);
        elements.push({
          data: { id: sharedId, label },
          classes: 'transition shared',
        });
      }

      if (!isShared) {
        elements.push({
          data: { id, label },
          classes: `transition ${colorClass}`,
        });
      }
    }

    // Arcs
    for (const arc of net.arcs) {
      const isSourcePlace = net.places.includes(arc.source);
      const sourceId = isSourcePlace
        ? `${objectType}__${arc.source}`
        : getTransitionId(arc.source, net, objectType, sharedTransitions);
      const targetId = net.places.includes(arc.target)
        ? `${objectType}__${arc.target}`
        : getTransitionId(arc.target, net, objectType, sharedTransitions);

      const arcClass =
        sourceId.startsWith(`${objectType}__`) || targetId.startsWith(`${objectType}__`)
          ? colorClass
          : 'shared';

      elements.push({
        data: {
          id: `${sourceId}__${targetId}`,
          source: sourceId,
          target: targetId,
          label: arc.label || '',
        },
        classes: arcClass,
      });
    }
  }

  return elements;
}

const getTransitionId = (
  id: string,
  net: OCNetModel['objects'][string],
  objectType: string,
  sharedMap: Map<string, string>
): string => {
  const found = net.transitions.find((t) => t.id === id);
  return found?.label
    ? sharedMap.get(found.label) ?? `shared__${slugify(found.label)}`
    : `${objectType}__${id}`;
}

const PetriNet = () => {

  const [includedObjects, setIncludedObjects] = useState<string[]>([])

  const { data: objectCounts = [] } = useObjectCount()

  const { data, isLoading } = usePetriNet({ objectTypes: includedObjects.length > 0 ? includedObjects : undefined });


  const objectTypes = data ? Object.keys(data.objects) : [];
  const colorMap = generateColorMap(objectTypes);
  const elements = data ? ocnetToElements(data, colorMap) : [];
  const stylesheet = generateStylesheet(colorMap);

  return (
    <Stack>
      {
        data ? <CytoscapeGraph
          elements={elements}
          stylesheet={stylesheet}
        />
          : <Skeleton width={"100%"} height={500} />
      }
      <MultiSelect label={"Include only Object types"} data={Object.keys(objectCounts)} value={includedObjects} onChange={setIncludedObjects} />
    </Stack>
  );
};

export default PetriNet;
export const config: RouteDefinition = { name: "PetriNet" };
