var ormjs;
ormjs.OptionMenu = class {

    static duplicate_action(event,objects) {
        // Duplicate object
        var targetID = event.target.id.toString();
        var obj = objects[ ormjs.Graph.get_parentID(targetID) ];
        if (obj == null) { return }
        obj.duplicate();
    }

    static conditional_label(event,objects,name,check) {
        /* Add a checkmark if condition is satisfied. */
        // Get target
        var targetID = event.target.id.toString();
        var obj = objects[ ormjs.Graph.get_parentID(targetID) ];
        return ormjs.OptionMenu.check_label(obj,name,check)
    }

    static check_label(obj,name,check) {
        /* Add a checkmark if condition is satisfied. */
        // Not sure what we clicked on? (catch-all)
        if (obj == null) { return name }
        // Condition true? Add check
        if ( obj.d3object.datum()[check] ) {
            return `${name} &nbsp;&nbsp;&#x2713;`
        }
        return name
    }

    static select_label(event,objects) {
        /* Selected 
        Add a checkmark if selected. */
        // Get object
        var targetID = event.target.id.toString();
        var object = objects[ ormjs.Graph.get_parentID(targetID) ];
        // Not sure what we clicked on? (catch-all)
        if (object == null) { return "Select" }
        // Check slected condition
        if ( object.d3object.classed("ormjs-selected") ) {
            return "Select &nbsp;&nbsp;&#x2713;"
        }
        return "Select"
    }

    static select_action(event,objects) {
        // Select object
        var targetID = event.target.id.toString();
        var object = objects[ ormjs.Graph.get_parentID(targetID) ];
        if (object == null) { return }
        object.d3object.classed("ormjs-selected") ? ormjs.Graph.unclass_as(object.id,"ormjs-selected")
                                                  : ormjs.Graph.class_as(object.id,"ormjs-selected");
    }

    static svg_menu(view) {
        return [
            {
                title: 'Entity',
                action: function(d, event) { 
                    // Create a new entity
                    var mouse = d3.pointer(event,event.target);
                    new ormjs.Entity( {x:mouse[0], y:mouse[1], view:view.id} );
                }
            },
            {
                title: 'Fact',
                action: function(d, event) { 
                    // Create a new fact (rolebox group)
                    var mouse = d3.pointer(event,event.target);
                    new ormjs.Predicate( {x:mouse[0], y:mouse[1], view:view.id} );
                }
            },
            {
                title: 'Value',
                action: function(d, event) { 
                    // Create a new value
                    var mouse = d3.pointer(event,event.target);
                    new ormjs.Value( {x:mouse[0], y:mouse[1], view:view.id} );
                }
            },
            {
                title: 'Constraint',
                action: function(d, event) { 
                    // Create a new constraint
                    var mouse = d3.pointer(event,event.target);
                    new ormjs.Constraint( {x:mouse[0], y:mouse[1], view:view.id} );
                }
            },
            {
                divider: true
            },
            {
                title: 'Select All',
                action: function(d, event) { 
                    ormjs.HighlightRegion.select_all(d.id);
                }
            }
        ];
    }

    static object_menu(objects) {
        return [
            {
                title: 'Duplicate',
                action: function(d, event) { 
                    ormjs.OptionMenu.duplicate_action(event,objects);
                }
            },
            {
                title: function(d, event) {
                    /* Select */
                    return ormjs.OptionMenu.select_label(event,objects)
                },
                action: function(d, event) { 
                    ormjs.OptionMenu.select_action(event,objects);
                }
            },
            {
                title: 'Properties',
                action: function(d, event) { 
                    // Open popup
                    ormjs.PropertyMenu.popup_event(event);
                }
            },
            {
                divider: true
            },
            {
                title: 'Delete',
                action: function(d, event) { 
                    // Delete object
                    ormjs.Graph.remove(event);
                }
            }
        ]
    }

    static entity_menu(modelID) {
        var entities = ormjs.models[modelID].objects.entity;
        return ormjs.OptionMenu.object_menu(entities)
    }

    static value_menu(modelID) {
        var values = ormjs.models[modelID].objects.value;
        return ormjs.OptionMenu.object_menu(values)
    }

    static constraint_menu(modelID) {
        var constraints = ormjs.models[modelID].objects.constraint;
        return ormjs.OptionMenu.object_menu(constraints)
    }

    static rolebox_menu(modelID) {
        var objects = ormjs.models[modelID].objects;
        return [
            {
                title: function(d, event) {
                    /* Mandatory 
                    Add a checkmark if rolebox is mandatory. */
                    // Get rolebox
                    var targetID = event.target.id.toString();
                    //var rboxID = targetID.substring(2,targetID.length);
                    var rboxID = ormjs.Graph.levelupID(targetID);
                    var rbox = objects.rolebox[ rboxID ];
                    return ormjs.OptionMenu.check_label(rbox,"Mandatory","mandatory")
                },
                action: function(d, event) {
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    //var rboxID = targetID.substring(2,targetID.length);
                    var rboxID = ormjs.Graph.levelupID(targetID);
                    var rbox = objects.rolebox[ rboxID ];
                    if (rbox == null) { return }
                    // Flip whether mandatory
                    rbox.flip_mandatory();
                    return
                }
            },
            {
                title: 'Uniqueness Constraint',
                action: function(d, event) { 
                    ormjs.PropertyMenu.popup_event(event);
                }
            },
            {
                divider: true
            },
            {
                title: function(d, event) {
                    /* Rotate */
                    return ormjs.OptionMenu.conditional_label(event,objects.rolebox_group,"Rotate","rotated")
                },
                action: function(d, event) {
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    var rbgroup = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    if (rbgroup == null) { return }
                    rbgroup.rotate();
                }
            },
            {
                title: function(d, event) {
                    /* Flip */
                    return ormjs.OptionMenu.conditional_label(event,objects.rolebox_group,"Flip","flipped")
                },
                action: function(d, event) {
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    var rbgroup = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    if (rbgroup == null) { return }
                    // Flip it
                    rbgroup.flip();
                }
            },
            {
                title: 'Duplicate',
                action: function(d, event) { 
                    ormjs.OptionMenu.duplicate_action(event,objects.rolebox_group);
                }
            },
            {
                title: function(d, event) {
                    /* Select */
                    return ormjs.OptionMenu.select_label(event,objects.rolebox_group)
                },
                action: function(d, event) { 
                    ormjs.OptionMenu.select_action(event,objects.rolebox_group);
                }
            },
            {
                title: 'Properties',
                action: function(d, event) { 
                    ormjs.PropertyMenu.popup_event(event);
                }
            },
            {
                divider: true
            },
            {
                title: 'Add Rolebox',
                action: function(d, event) {
                    // Add rolebox to group
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    var rbgroup = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    if (rbgroup == null) { return }
                    // Add rolebox
                    rbgroup.add_rolebox();
                }
            },
            {
                title: 'Delete Last Rolebox',
                action: function(d, event) {
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    var rbgroup = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    if (rbgroup == null) { return }
                    // Determine last rolebox
                    var boxes = [...rbgroup.d3object.datum().boxes];
                    if (rbgroup.d3object.datum().flipped) { boxes.reverse(); }
                    var rbox = objects.rolebox[ boxes[boxes.length-1] ];
                    // Delete rolebox
                    rbox.delete();
                    return
                }
            },
            {
                title: 'Delete Fact',
                action: function(d, event) {
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    var rbgroup = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    if (rbgroup == null) { return }
                    rbgroup.delete();
                }
            }
        ];
    }

    static connector_menu(d, modelID) {
        if (d.conntype == "subtype") {
            var connectors = ormjs.models[modelID].objects.connector;
            return ormjs.OptionMenu.connOptions_subtype(connectors)
        } else {
            return ormjs.OptionMenu.connOptions_default
        }
    }

    static connOptions_default =
    [
        {
            title: 'Delete',
            action: function(d, event) { 
                ormjs.Connector.remove(event);
            }
        }
    ];

    static connOptions_subtype(connectors) {
        return [
            {
                title: function(d, event) {
                    /* Preferred Identifier
                    Add a checkmark if selected. */
                    // Get object
                    var targetID = event.target.id.toString();
                    var object = connectors[ ormjs.Graph.get_parentID(targetID) ];
                    // Not sure what we clicked on? (catch-all)
                    if (object == null) { return "Preferred Identifier" }
                    // Check slected condition
                    if ( object.d3object.datum().preferred ) {
                        return "Preferred Identifier &nbsp;&nbsp;&#x2713;"
                    }
                    return "Preferred Identifier"
                },
                action: function(d, event) { 
                    var targetID = event.target.id.toString();
                    var object = connectors[ ormjs.Graph.get_parentID(targetID) ];
                    // Not sure what we clicked on? (catch-all)
                    if (object == null) { return }
                    var d = object.d3object.datum();
                    d.preferred ? d.preferred = false
                                : d.preferred = true;
                    object.draw();
                }
            },
            {
                title: 'Delete',
                action: function(d, event) { 
                    ormjs.Connector.remove(event);
                }
            }
        ];
    }

}
