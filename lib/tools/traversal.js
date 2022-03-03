/* Traversal */

var ormjs;

ormjs.Traversal = class {

    static activate(view) {

        var in_view = view.objects_in_view();
        console.log("activate", in_view)

        in_view.map( (objID) => {
            ormjs.Traversal.actions(objID, view);
        });

        ormjs.Traversal.set_hideall(view);

    }

    static deactivate(view) {

        var in_view = view.objects_in_view();

        in_view.map( (objID) => {
            ormjs.Traversal.reset_actions(objID);
        });

        ormjs.Traversal.unclass_all(view);

    }

    static update(view) {
        console.log("update triggered")
        view.traversal ? ormjs.Traversal.activate(view)
                       : ormjs.Traversal.deactivate(view);
    }

    static actions(objID,view) {
        
        // No drag
        var drag_event = d3.drag()
            .on("start", null )
            .on("drag", null )
            .on("end", null );

        // Only flipping selected on click
        d3.select(`#${objID}`)
            .on("dblclick", null)
            .on("contextmenu", null)
            .on("click", () => {ormjs.Traversal.flip_selected(objID,view)} )
            .call(drag_event);

        if (ormjs.Graph.object_kind(objID) == "rolebox_group") {
            var boxes = d3.select(`#${objID}`).datum().boxes;
            boxes.map( (boxID) => {
                d3.select(`#${boxID}`)
                    .on("contextmenu", null);
                ormjs.Graph.class_as(`o-${boxID}`, "toverlay");
            })
        } else {
            ormjs.Graph.class_as(`o-${objID}`, "toverlay");
        }
        
    }

    static reset_actions(objID) {
        // Add back normal actions
        ormjs.Graph.any_object(objID).actions();

        if (ormjs.Graph.object_kind(objID) == "rolebox_group") {
            var boxes = d3.select(`#${objID}`).datum().boxes;
            boxes.map( (boxID) => {
                ormjs.Graph.any_object(boxID).actions();
                ormjs.Graph.unclass_as(`o-${boxID}`, "toverlay");
            })
        } else {
            ormjs.Graph.unclass_as(`o-${objID}`, "toverlay");
        }
    }

    static flip_selected(objID,view) {
        d3.select(`#${objID}`).classed("tselected") ? ormjs.Traversal.unselect(objID)
                                                    : ormjs.Traversal.select(objID);

        ormjs.Traversal.set_hideall(view);
    }

    static simple_select(objID) {
        ormjs.Graph.unclass_as(objID, "thidden");
        ormjs.Graph.unclass_as(objID, "tneighbor");
        ormjs.Graph.class_as(objID, "tselected");
    }

    static select(objID) {
        ormjs.Traversal.simple_select(objID);
        ormjs.Traversal.unclass_connectors(objID, "thidden");
        ormjs.Traversal.class_connectors(objID, "tneighbor");
        var nodes = ormjs.Entity.nearest_neighbors(objID);
        nodes.nonterminal.map( (nnID) => {
            ormjs.Graph.unclass_as(nnID, "thidden");
            ormjs.Traversal.unclass_connectors(nnID, "thidden");
            ormjs.Graph.class_as(nnID, "tneighbor");
            ormjs.Traversal.class_connectors(nnID, "tneighbor");
        });
        nodes.selected = d3.selectAll(`.tselected`).nodes().map( (node) => {return node.id} );
        nodes.terminal = nodes.terminal.filter(value => !nodes.selected.includes(value));
        nodes.terminal.map( (nnID) => {
            ormjs.Graph.unclass_as(nnID, "thidden");
            ormjs.Graph.class_as(nnID, "tneighbor");
        });
        ormjs.Traversal.select_predicates(nodes);
    }

    static unselect(objID) {
        ormjs.Graph.unclass_as(objID, "tselected");
        ormjs.Graph.class_as(objID, "tneighbor");
    }

    static class_connectors(objID, classname) {
        var connlist = d3.select(`#${objID}`).datum().connectors;
        console.log("class connectors", connlist)
        connlist.map( (connID) => {
            ormjs.Graph.class_as(connID, classname);
            console.log("class connector", connID, classname, d3.select(`#${connID}`).datum().conntype)
        });
    }

    static unclass_connectors(objID, classname) {
        var connlist = d3.select(`#${objID}`).datum().connectors;
        connlist.map( (connID) => {
            ormjs.Graph.unclass_as(connID, classname);
            console.log("unclass connector", connID, classname, d3.select(`#${connID}`).datum().conntype)
        });
    }

    static select_predicates(nodes) {
        nodes.nonterminal.map( (nnID) => {
            if ( nnID.includes("rolebox") ) {
                var rpIDs = ormjs.Graph.any_object(nnID).role_players();
                var slct = rpIDs.every( (rpID) => { return d3.select(`#${rpID}`).classed("tselected"); });
                if (slct) { ormjs.Traversal.simple_select(nnID); }
            }
        });
    }

    static unclass_all(view) {
        var classlist = ["tneighbor", "tselected", "thidden"];
        var in_view = view.objects_in_view();
        classlist.map( (cls) => {
            var objlist = d3.selectAll(`.${cls}`).nodes().map( (node) => {return node.id} );
            var overlap = objlist.filter(value => in_view.includes(value));
            overlap.map( (objID) => { 
                ormjs.Graph.unclass_as(objID, cls); 
                ormjs.Traversal.unclass_connectors(objID, cls);
            });
        });
    }

    static set_hideall(view) {
        var in_view = view.objects_in_view();
        var selected = d3.selectAll(`.tselected`).nodes().map( (node) => {return node.id} );
        var overlap = selected.filter(value => in_view.includes(value));
        if (overlap.length == 0) {
            in_view.map( (objID) => {
                ormjs.Graph.unclass_as(objID, "thidden");
                ormjs.Traversal.unclass_connectors(objID, "thidden");
                ormjs.Graph.class_as(objID, "tneighbor");
                ormjs.Traversal.class_connectors(objID, "tneighbor");
            });
        } else {
            var unselected = in_view.filter(value => !selected.includes(value));
            unselected.map( (objID) => {
                ormjs.Graph.class_as(objID, "thidden");
                ormjs.Traversal.class_connectors(objID, "thidden");
            });
            selected.map( (objID) => {
                ormjs.Traversal.select(objID);
            });
        }
    }
}