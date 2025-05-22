from plugins.berti.models import Arc, OCNet, OCNetModel, Transition


def parse_pm4py_ocpn(raw: dict[str, tuple]) -> OCNetModel:
    result = {}

    for obj_type, (net, _, _) in raw.items():
        # Access PetriNet object attributes
        places = net.places
        transitions = net.transitions
        arcs = net.arcs

        place_ids = [p.name for p in places]

        t_objs = [
            Transition(id=t.name, label=getattr(t, "label", None)) for t in transitions
        ]

        arc_objs = []
        for arc in arcs:
            src = arc.source
            tgt = arc.target
            source_id = getattr(src, "name", str(src))
            target_id = getattr(tgt, "name", str(tgt))

            label = getattr(src, "label", None) if hasattr(src, "label") else None
            arc_objs.append(Arc(source=source_id, target=target_id, label=label))

        result[obj_type] = OCNet(places=place_ids, transitions=t_objs, arcs=arc_objs)

    return OCNetModel(objects=result)
