from api.model.process_models import (
    Arc,
    ObjectCentricPetriNet,
    PetriNet,
    Place,
    Transition,
)
from pm4py.objects.petri_net.obj import PetriNet as PMNet


def convert_flat_pm4py_to_ocpn(flat_nets: dict[str, PMNet]) -> ObjectCentricPetriNet:
    place_set: list[Place] = []
    transition_map: dict[str, Transition] = {}
    arcs: list[Arc] = []

    seen_places: set[str] = set()

    for object_type, pm_net in flat_nets.items():
        pm_net = pm_net[0]

        for place in pm_net.places:
            qualified_id = f"{object_type}:{place.name}"
            if qualified_id not in seen_places:
                place_set.append(
                    Place(
                        id=qualified_id,
                        place_type="source"
                        if place == "source"
                        else "sink"
                        if place == "sink"
                        else None,
                        object_type=object_type,
                        annotations={},
                    )
                )
                seen_places.add(qualified_id)

        for transition in pm_net.transitions:
            label = transition.label or transition.name  # Use fallback if label is None
            if label not in transition_map:
                transition_map[label] = Transition(
                    id=label, label=transition.label, annotations={}
                )

        for arc in pm_net.arcs:
            source_id = (
                arc.source.name
                if isinstance(arc.source, (PMNet.Place, PMNet.Transition))
                else str(arc.source)
            )
            target_id = (
                arc.target.name
                if isinstance(arc.target, (PMNet.Place, PMNet.Transition))
                else str(arc.target)
            )

            # Adjust for qualified place IDs
            if isinstance(arc.source, PMNet.Place):
                source_id = f"{object_type}:{source_id}"
            if isinstance(arc.target, PMNet.Place):
                target_id = f"{object_type}:{target_id}"

            # If transition, map to unified label
            if isinstance(arc.source, PMNet.Transition):
                source_id = arc.source.label or arc.source.name
            if isinstance(arc.target, PMNet.Transition):
                target_id = arc.target.label or arc.target.name

            arcs.append(
                Arc(source=source_id, target=target_id, variable=False, annotations={})
            )

    # Assemble the final Petri net and OCPN
    net = PetriNet(
        places=place_set, transitions=list(transition_map.values()), arcs=arcs
    )
    return ObjectCentricPetriNet(
        net=net,
    )
