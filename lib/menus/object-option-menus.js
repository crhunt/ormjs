var ormjs;
ormjs.OptionMenu = class {

    static svg_menu(view) {
        var modelID = view.model;
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
                    //draw_fact(mouse[0],mouse[1]);
                    new ormjs.Predicate( {x:mouse[0], y:mouse[1], view:view.id} );
                }
            },
            {
                title: 'Value',
                action: function(d, event) { 
                    // Create a new value
                    var mouse = d3.pointer(event,event.target);
                    //draw_value(mouse[0],mouse[1]);
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

    static entity_menu(modelID) {
        var entities = ormjs.models[modelID].objects.entity;
        return [
            {
                title: 'Duplicate',
                action: function(d, event) { 
                    // Duplicate entity
                    var targetID = event.target.id.toString();
                    var entity = entities[ ormjs.Graph.get_parentID(targetID) ];
                    if (entity == null) { return }
                    //duplicate_entity(entity);
                    entity.duplicate();
                }
            },
            {
                title: function(d, event) {
                    /* Selected 
                       Add a checkmark if selected. */
                    // Get object
                    var targetID = event.target.id.toString();
                    var object = entities[ ormjs.Graph.get_parentID(targetID) ];
                    // Not sure what we clicked on? (catch-all)
                    if (object == null) { return "Select" }
                    // Check slected condition
                    if ( object.d3object.classed("selected") ) {
                        return "Select &nbsp;&nbsp;&#x2713;"
                    }
                    return "Select"
                },
                action: function(d, event) { 
                    // Select object
                    var targetID = event.target.id.toString();
                    var object = entities[ ormjs.Graph.get_parentID(targetID) ];
                    if (object == null) { return }
                    object.d3object.classed("selected") ? ormjs.Graph.unclass_as(object.id,"selected")
                                                        : ormjs.Graph.class_as(object.id,"selected");
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
                    // Delete entity
                    //remove_entity(event);
                    ormjs.Entity.remove(event);
                }
            }
        ];
    }

    static value_menu(modelID) {
        var values = ormjs.models[modelID].objects.value;
        return [
            {
                title: 'Duplicate',
                action: function(d, event) { 
                    // Duplicate value
                    var targetID = event.target.id.toString();
                    var value = values[ ormjs.Graph.get_parentID(targetID) ];
                    if (value == null) { return }
                    value.duplicate();
                }
            },
            {
                title: function(d, event) {
                    /* Selected 
                       Add a checkmark if selected. */
                    // Get object
                    var targetID = event.target.id.toString();
                    var object = values[ ormjs.Graph.get_parentID(targetID) ];
                    // Not sure what we clicked on? (catch-all)
                    if (object == null) { return "Select" }
                    // Check slected condition
                    if ( object.d3object.classed("selected") ) {
                        return "Select &nbsp;&nbsp;&#x2713;"
                    }
                    return "Select"
                },
                action: function(d, event) { 
                    // Select object
                    var targetID = event.target.id.toString();
                    var object = values[ ormjs.Graph.get_parentID(targetID) ];
                    if (object == null) { return }
                    object.d3object.classed("selected") ? ormjs.Graph.unclass_as(object.id,"selected")
                                                        : ormjs.Graph.class_as(object.id,"selected");
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
                    // Delete value
                    ormjs.Value.remove(event);
                }
            }
        ];
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
                    var rboxID = targetID.substring(2,targetID.length);
                    var rbox = objects.rolebox[ rboxID ];
                    // Not sure what we clicked on? (catch-all)
                    if (rbox == null) { return "Mandatory" }
                    // Mandatory? Add check
                    if ( rbox.d3object.datum().mandatory == true ) {
                        return "Mandatory &nbsp;&nbsp;&#x2713;"
                    }
                    return "Mandatory"
                },
                action: function(d, event) {
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    var rboxID = targetID.substring(2,targetID.length);
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
                    /* Rotate 
                    Add a checkmark if fact is rotated. */
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    var rbgroup = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    // Not sure what we clicked on? (catch-all)
                    if (rbgroup == null) { return "Rotate" }
                    // Rotated? Add check
                    if ( rbgroup.d3object.datum().rotated == true ) {
                        return "Rotate &nbsp;&nbsp;&#x2713;"
                    }
                    return "Rotate"
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
                    /* Flip 
                    Add a checkmark if fact is flipped. */
                    // Get rolebox group
                    var targetID = event.target.id.toString();
                    var rbgroup = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    // Not sure what we clicked on? (catch-all)
                    if (rbgroup == null) { return "Flip" }
                    // Flipped? Add check
                    if ( rbgroup.d3object.datum().flipped == true ) {
                        return "Flip &nbsp;&nbsp;&#x2713;"
                    }
                    return "Flip"
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
                    // Duplicate rolebox group
                    var targetID = event.target.id.toString();
                    var rbgroup = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    if (rbgroup == null) { return }
                    rbgroup.duplicate();
                    return
                }
            },
            {
                title: function(d, event) {
                    /* Selected 
                    Add a checkmark if selected. */
                    // Get object
                    var targetID = event.target.id.toString();
                    var object = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    // Not sure what we clicked on? (catch-all)
                    if (object == null) { return "Select" }
                    // Check slected condition
                    if ( object.d3object.classed("selected") ) {
                        return "Select &nbsp;&nbsp;&#x2713;"
                    }
                    return "Select"
                },
                action: function(d, event) { 
                    // Select object
                    var targetID = event.target.id.toString();
                    var object = objects.rolebox_group[ ormjs.Graph.get_parentID(targetID) ];
                    if (object == null) { return }
                    object.d3object.classed("selected") ? ormjs.Graph.unclass_as(object.id,"selected")
                                                        : ormjs.Graph.class_as(object.id,"selected");
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

    static constraint_menu(modelID) {
        var constraints = ormjs.models[modelID].objects.constraint;
        return [   
            {
                title: 'Duplicate',
                action: function(d, event) { 
                    // Duplicate value
                    var targetID = event.target.id.toString();
                    var constraint = constraints[ ormjs.Graph.get_parentID(targetID) ];
                    if (constraint == null) { return }
                    constraint.duplicate();
                }
            },
            {
                title: function(d, event) {
                    /* Selected 
                    Add a checkmark if selected. */
                    // Get object
                    var targetID = event.target.id.toString();
                    var object = constraints[ ormjs.Graph.get_parentID(targetID) ];
                    // Not sure what we clicked on? (catch-all)
                    if (object == null) { return "Select" }
                    // Check slected condition
                    if ( object.d3object.classed("selected") ) {
                        return "Select &nbsp;&nbsp;&#x2713;"
                    }
                    return "Select"
                },
                action: function(d, event) { 
                    // Select object
                    var targetID = event.target.id.toString();
                    var object = constraints[ ormjs.Graph.get_parentID(targetID) ];
                    if (object == null) { return }
                    object.d3object.classed("selected") ? ormjs.Graph.unclass_as(object.id,"selected")
                                                        : ormjs.Graph.class_as(object.id,"selected");
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
                    ormjs.Constraint.remove(event);
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
