/* Traversal 

    A tool for graphically traversing an ORM diagram. Click events highlight paths
    through the ORM diagram and alter which components of the ORM diagram are visible. 
    Fact statements of highlighted facts are displayed in the inner html of the id set 
    by traversal_target (in the view object). 

 */

var ormjs;

ormjs.Traversal = class {

    static activate(view) {

        /* 
            Activate traversal mode.
            Disable typical object actions and enable click-select
            events.
        */

        var in_view = view.objects_in_view();

        in_view.map( (objID) => {
            ormjs.Traversal.actions(objID, view);
        });

        ormjs.Traversal.set_traversal_classes(view);

    }

    static deactivate(view) {

        /* 
            De-activate traversal mode.
            Renable typical object actions and disable click-select
            events.
        */

        var in_view = view.objects_in_view();

        in_view.map( (objID) => {
            ormjs.Traversal.reset_actions(objID);
        });

        ormjs.Traversal.unclass_all(view);

        ormjs.GenerateRel.display_rel( ormjs.models[view.model] );

    }

    static update(view) {
        /* 
            Activate / deactivate traversal mode based on value of
            view.traversal (boolean).
        */

        view.traversal ? ormjs.Traversal.activate(view)
                       : ormjs.Traversal.deactivate(view);
    }

    static actions(objID,view) {

        /* 
            Disable normal object actions and enable click actions.
        */
        
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

        if (ormjs.Graph.object_kind(objID) == "predicate") {
            var boxes = d3.select(`#${objID}`).datum().boxes;
            boxes.map( (boxID) => {
                d3.select(`#${boxID}`)
                    .on("contextmenu", null);
                ormjs.Graph.class_as(`o-${boxID}`, "ormjs-toverlay");
            })
        } else {
            ormjs.Graph.class_as(`o-${objID}`, "ormjs-toverlay");
        }
        
    }

    static reset_actions(objID) {
        /* 
            Re-enable normal object actions.
        */
        ormjs.Graph.any_object(objID).actions();

        if (ormjs.Graph.object_kind(objID) == "predicate") {
            var boxes = d3.select(`#${objID}`).datum().boxes;
            boxes.map( (boxID) => {
                ormjs.Graph.any_object(boxID).actions();
                ormjs.Graph.unclass_as(`o-${boxID}`, "ormjs-toverlay");
            })
        } else {
            ormjs.Graph.unclass_as(`o-${objID}`, "ormjs-toverlay");
        }
    }

    static flip_selected(objID,view) {
        /* 
            Toggle whether objID is selected.
        */
        d3.select(`#${objID}`).classed("ormjs-tselected") ? ormjs.Traversal.unselect(objID)
                                                    : ormjs.Traversal.select(objID);
        // Update what is visible
        ormjs.Traversal.set_traversal_classes(view);
        // Update fact display
        ormjs.Traversal.highlighted_facts(view);
    }

    static simple_select(objID) {
        /* 
            Select objID
        */
        ormjs.Graph.unclass_as(objID, "ormjs-thidden");
        ormjs.Graph.unclass_as(objID, "ormjs-tneighbor");
        ormjs.Graph.class_as(objID, "ormjs-tselected");
    }

    static select(objID) {
        /* 
            Select objID and set classes of neighbor objects.
        */
        // Select this object
        ormjs.Traversal.simple_select(objID);
        // Class connectors as neighbors
        ormjs.Traversal.unclass_connectors(objID, "ormjs-thidden");
        ormjs.Traversal.class_connectors(objID, "ormjs-tneighbor");
        // Get all nearest neighbors
        var nodes = ormjs.Entity.nearest_neighbors(objID);
        // Get all selected nodes
        nodes.selected = d3.selectAll(`.tselected`).nodes().map( (node) => {return node.id} );
        // Remove selected nodes from terminal/non-terminal lists
        nodes.nonterminal = nodes.nonterminal.filter(value => !nodes.selected.includes(value));
        nodes.terminal = nodes.terminal.filter(value => !nodes.selected.includes(value));
        // Reclass nonterminal nodes as neighbors
        nodes.nonterminal.map( (nnID) => {
            ormjs.Graph.unclass_as(nnID, "ormjs-thidden");
            ormjs.Traversal.unclass_connectors(nnID, "ormjs-thidden");
            ormjs.Graph.class_as(nnID, "ormjs-tneighbor");
            ormjs.Traversal.class_connectors(nnID, "ormjs-tneighbor");
        });
        // Reclass terminal nodes as neighbors
        nodes.terminal.map( (nnID) => {
            ormjs.Graph.unclass_as(nnID, "ormjs-thidden");
            ormjs.Graph.class_as(nnID, "ormjs-tneighbor");
        });
        // Predicates with role players that are selected should also be selected
        ormjs.Traversal.select_predicates(nodes);
    }

    static unselect(objID) {
        /* 
            Unselect objID. 
        */
        ormjs.Graph.unclass_as(objID, "ormjs-tselected");
        ormjs.Graph.class_as(objID, "ormjs-tneighbor");
    }

    static class_connectors(objID, classname) {
        /* 
            Set all connectors of objID to class classname
        */
        var connlist = d3.select(`#${objID}`).datum().connectors;
        connlist.map( (connID) => {
            ormjs.Graph.class_as(connID, classname);
        });
    }

    static unclass_connectors(objID, classname) {
        /* 
            Unclass all connectors of objID to class classname
        */
        var connlist = d3.select(`#${objID}`).datum().connectors;
        connlist.map( (connID) => {
            ormjs.Graph.unclass_as(connID, classname);
        });
    }

    static select_predicates(nodes) {
        /* 
            Class all predicates between two selected objects as selected.
        */
        nodes.nonterminal.map( (nnID) => {
            if ( nnID.includes("rolebox") ) {
                var rpIDs = ormjs.Graph.any_object(nnID).role_players();
                var slct = rpIDs.every( (rpID) => { return d3.select(`#${rpID}`).classed("ormjs-tselected"); });
                if (slct) { ormjs.Traversal.simple_select(nnID); }
            }
        });
    }

    static unclass_all(view) {
        /* 
            Unclass all connectors of objID from class classname
        */
        var classlist = ["ormjs-tneighbor", "ormjs-tselected", "ormjs-thidden"];
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

    static set_traversal_classes(view) {
        /* 
            Set all classes based on selected status. If no objects are selected,
            set all objects as "ormjs-tneighbor" so they are visible.
        */
        var in_view = view.objects_in_view();
        var selected = d3.selectAll(`.tselected`).nodes().map( (node) => {return node.id} );
        var overlap = selected.filter(value => in_view.includes(value));
        if (overlap.length == 0) {
            in_view.map( (objID) => {
                ormjs.Graph.unclass_as(objID, "ormjs-thidden");
                ormjs.Traversal.unclass_connectors(objID, "ormjs-thidden");
                ormjs.Graph.class_as(objID, "ormjs-tneighbor");
                ormjs.Traversal.class_connectors(objID, "ormjs-tneighbor");
            });
        } else {
            var unselected = in_view.filter(value => !selected.includes(value));
            unselected.map( (objID) => {
                ormjs.Graph.class_as(objID, "ormjs-thidden");
                ormjs.Traversal.class_connectors(objID, "ormjs-thidden");
            });
            selected.map( (objID) => {
                ormjs.Traversal.select(objID);
            });
        }
    }

    static highlighted_facts(view) {
        /* 
            Get main fact from each selected predicate.
        */
        // Get selected facts
        var metamodel = ormjs.models[view.model].metamodel;
        var predicates = ormjs.Traversal.highlighted_predicates(view);
        var factmap = {};
        for (var factID in metamodel.Fact) {
            factmap[metamodel.Fact[factID]._rbgID] = factID;
        }
        var statements = predicates.map( (predID) => {
            return metamodel.Fact[ factmap[predID] ].ReadingOrder[0].Reading[0]._Statement;
        }).filter(v=>v);
        ormjs.Traversal.publish_statements(statements,view);
        return statements
    }

    static publish_statements(statements,view) {
        /* 
            Dump statements to the inner html set by view.traversal_target
        */
        if ( !(view.traversal_target == null)) {
            var content = statements.join("</p><p>")
            d3.select(`#${view.traversal_target}`).html(`<p>${content}</p>`);
        }
    }

    static highlighted_predicates(view) {
        /* 
            Return all predicates that are highlighted.
        */
        var in_view = view.objects_in_view();
        var selected = d3.selectAll(`.tselected`).nodes().map( (node) => {return node.id} );
        var overlap = selected.filter(value => in_view.includes(value));
        var predicates = overlap.map( (sID) => {
            if(sID.includes("rolebox")) { return sID }
        }).filter(v=>v);

        return predicates
    }

}