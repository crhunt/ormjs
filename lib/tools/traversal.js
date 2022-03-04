/* Traversal */

var ormjs;
var metamodel;

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

        display_rel();

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
        // Update what is visible
        ormjs.Traversal.set_hideall(view);
        // Update fact display
        ormjs.Traversal.highlighted_facts(view);
    }

    static simple_select(objID) {
        ormjs.Graph.unclass_as(objID, "thidden");
        ormjs.Graph.unclass_as(objID, "tneighbor");
        ormjs.Graph.class_as(objID, "tselected");
    }

    static select(objID) {
        // Select this object
        ormjs.Traversal.simple_select(objID);
        // Class connectors as neighbors
        ormjs.Traversal.unclass_connectors(objID, "thidden");
        ormjs.Traversal.class_connectors(objID, "tneighbor");
        // Get all nearest neighbors
        var nodes = ormjs.Entity.nearest_neighbors(objID);
        // Get all selected nodes
        nodes.selected = d3.selectAll(`.tselected`).nodes().map( (node) => {return node.id} );
        // Remove selected nodes from terminal/non-terminal lists
        nodes.nonterminal = nodes.nonterminal.filter(value => !nodes.selected.includes(value));
        nodes.terminal = nodes.terminal.filter(value => !nodes.selected.includes(value));
        // Reclass nonterminal nodes as neighbors
        nodes.nonterminal.map( (nnID) => {
            ormjs.Graph.unclass_as(nnID, "thidden");
            ormjs.Traversal.unclass_connectors(nnID, "thidden");
            ormjs.Graph.class_as(nnID, "tneighbor");
            ormjs.Traversal.class_connectors(nnID, "tneighbor");
        });
        // Reclass terminal nodes as neighbors
        nodes.terminal.map( (nnID) => {
            ormjs.Graph.unclass_as(nnID, "thidden");
            ormjs.Graph.class_as(nnID, "tneighbor");
        });
        // Predicates with role players that are selected should also be selected
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

    static highlighted_facts(view) {
        // Get selected facts
        var predicates = ormjs.Traversal.highlighted_predicates(view);
        var factmap = {};
        for (var factID in metamodel.Fact) {
            factmap[metamodel.Fact[factID]._rbgID] = factID;
        }
        var statements = predicates.map( (predID) => {
            return metamodel.Fact[ factmap[predID] ].ReadingOrder[0].Reading[0]._Statement;
        }).filter(v=>v);
        console.log(statements)
        ormjs.Traversal.publish_statements(statements,view);
        return statements
    }

    static publish_statements(statements,view) {
        // Dump statements to the inner html set by view.traversal_target
        var content = statements.join("</p><p>")
        d3.select(`#${view.traversal_target}`).html(`<p>${content}</p>`);
    }

    static highlighted_predicates(view) {
        var in_view = view.objects_in_view();
        var selected = d3.selectAll(`.tselected`).nodes().map( (node) => {return node.id} );
        var overlap = selected.filter(value => in_view.includes(value));
        var predicates = overlap.map( (sID) => {
            if(sID.includes("rolebox")) { return sID }
        }).filter(v=>v);

        return predicates
    }

    static extremities(view,classname) {
        if (arguments.length == 2) {
            var idlist = d3.selectAll(`.${classname}`).nodes().map( (node) => {return node.id} );
        } else {
            var idlist = view.objects_in_view();
        }

        var values = { 
            north: {obj: null, position: Number.MAX_VALUE },
            south: {obj: null, position: -Number.MAX_VALUE },
            east: {obj: null, position: Number.MAX_VALUE },
            west: {obj: null, position: -Number.MAX_VALUE },
        }
    }
}