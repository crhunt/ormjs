var svgOptions =
    [
        {
            title: 'Entity',
            action: function(d, event) { 
                // Create a new entity
                var mouse = d3.pointer(event,event.target);
                new Entity( {x:mouse[0], y:mouse[1]} );
            }
        },
        {
            title: 'Fact',
            action: function(d, event) { 
                // Create a new fact (rolebox group)
                var mouse = d3.pointer(event,event.target);
                //draw_fact(mouse[0],mouse[1]);
                new Predicate( {x:mouse[0], y:mouse[1]} );
            }
        },
        {
            title: 'Value',
            action: function(d, event) { 
                // Create a new value
                var mouse = d3.pointer(event,event.target);
                //draw_value(mouse[0],mouse[1]);
                new Value( {x:mouse[0], y:mouse[1]} );
            }
        },
        {
            title: 'Constraint',
            action: function(d, event) { 
                // Create a new constraint
                var mouse = d3.pointer(event,event.target);
                new Constraint( {x:mouse[0], y:mouse[1]} );
            }
        },
        {
            divider: true
        },
        {
            title: 'Select All',
            action: function(d, event) { 
                select_all();
            }
        }
    ];

var entityOptions =
    [
        {
            title: 'Duplicate',
            action: function(d, event) { 
                // Duplicate entity
                var targetID = event.target.id.toString();
                var entity = orm.entities[ get_parentID(targetID) ];
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
                var object = orm.entities[ get_parentID(targetID) ];
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
                var object = orm.entities[ get_parentID(targetID) ];
                if (object == null) { return }
                object.d3object.classed("selected") ? unclass_as(object.id,"selected")
                                                    : class_as(object.id,"selected");
            }
        },
        {
            title: 'Properties',
            action: function(d, event) { 
                // Open popup
                popup_event(event);
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
                Entity.remove(event);
            }
        }
    ];

var valueOptions =
    [
        {
            title: 'Duplicate',
            action: function(d, event) { 
                // Duplicate value
                var targetID = event.target.id.toString();
                var value = orm.values[ get_parentID(targetID) ];
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
                var object = orm.values[ get_parentID(targetID) ];
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
                var object = orm.values[ get_parentID(targetID) ];
                if (object == null) { return }
                object.d3object.classed("selected") ? unclass_as(object.id,"selected")
                                                    : class_as(object.id,"selected");
            }
        },
        {
            title: 'Properties',
            action: function(d, event) { 
                // Open popup
                popup_event(event);
            }
        },
        {
            divider: true
        },
        {
            title: 'Delete',
            action: function(d, event) { 
                // Delete value
                Value.remove(event);
            }
        }
    ];

var roleboxOptions =
    [
        {
            title: function(d, event) {
                /* Mandatory 
                   Add a checkmark if rolebox is mandatory. */
                // Get rolebox
                var targetID = event.target.id.toString();
                var rboxID = targetID.substring(2,targetID.length);
                var rbox = orm.roleboxes[ rboxID ];
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
                var rbox = orm.roleboxes[ rboxID ];
                if (rbox == null) { return }
                // Flip whether mandatory
                //flip_mandatory_role(rbox);
                //rbox.flip_mandatory();
                return
            }
        },
        {
            title: 'Uniqueness Constraint',
            action: function(d, event) { 
                popup_event(event);
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
                var rbgroup = orm.rbgroups[ get_parentID(targetID) ];
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
                var rbgroup = orm.rbgroups[ get_parentID(targetID) ];
                if (rbgroup == null) { return }
                //rotate_rolebox_group(rbgroup);
                rbgroup.rotate();
            }
        },
        {
            title: function(d, event) {
                /* Flip 
                   Add a checkmark if fact is flipped. */
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_parentID(targetID) ];
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
                var rbgroup = orm.rbgroups[ get_parentID(targetID) ];
                if (rbgroup == null) { return }
                // Flip it
                //flip_rolebox_group(rbgroup);
                rbgroup.flip();
            }
        },
        {
            title: 'Duplicate',
            action: function(d, event) { 
                // Duplicate rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_parentID(targetID) ];
                if (rbgroup == null) { return }
                //duplicate_fact(rbgroup);
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
                var object = orm.rbgroups[ get_parentID(targetID) ];
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
                var object = orm.rbgroups[ get_parentID(targetID) ];
                if (object == null) { return }
                object.d3object.classed("selected") ? unclass_as(object.id,"selected")
                                                    : class_as(object.id,"selected");
            }
        },
        {
            title: 'Properties',
            action: function(d, event) { 
                popup_event(event);
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
                var rbgroup = orm.rbgroups[ get_parentID(targetID) ];
                if (rbgroup == null) { return }
                // Add rolebox
                //add_rolebox(rbgroup);
                rbgroup.add_rolebox();
            }
        },
        {
            title: 'Delete Last Rolebox',
            action: function(d, event) {
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_parentID(targetID) ];
                if (rbgroup == null) { return }
                // Determine last rolebox
                var boxes = [...rbgroup.d3object.datum().boxes];
                if (rbgroup.d3object.datum().flipped) { boxes.reverse(); }
                var rbox = orm.roleboxes[ boxes[boxes.length-1] ];
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
                var rbgroup = orm.rbgroups[ get_parentID(targetID) ];
                if (rbgroup == null) { return }
                //delete_fact(rbgroup);
                rbgroup.delete();
            }
        }
    ];

var connOptions = function(d) {
    if (d.conntype == "subtype") {
        return connOptions_subtype
    } else {
        return connOptions_default
    }
}

var connOptions_default =
    [
        {
            title: 'Delete',
            action: function(d, event) { 
                Connector.remove(event);
            }
        }
    ];

var connOptions_subtype =
    [
        {
            title: function(d, event) {
                /* Preferred Identifier
                   Add a checkmark if selected. */
                // Get object
                var targetID = event.target.id.toString();
                var object = orm.connectors[ get_parentID(targetID) ];
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
                var object = orm.connectors[ get_parentID(targetID) ];
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
                Connector.remove(event);
            }
        }
    ];

var constraintOptions =
    [   
        {
            title: 'Duplicate',
            action: function(d, event) { 
                // Duplicate value
                var targetID = event.target.id.toString();
                var constraint = orm.constraints[ get_parentID(targetID) ];
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
                var object = orm.constraints[ get_parentID(targetID) ];
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
                var object = orm.constraints[ get_parentID(targetID) ];
                if (object == null) { return }
                object.d3object.classed("selected") ? unclass_as(object.id,"selected")
                                                    : class_as(object.id,"selected");
            }
        },
        {
            title: 'Properties',
            action: function(d, event) { 
                // Open popup
                popup_event(event);
            }
        },
        {
            divider: true
        },
        {
            title: 'Delete',
            action: function(d, event) { 
                Constraint.remove(event);
            }
        }
    ];