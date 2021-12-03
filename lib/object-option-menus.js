var svgOptions =
    [
        {
            title: 'Entity',
            action: function(d, event) { 
                // Create a new entity
                var mouse = d3.pointer(event,event.target);
                draw_entity(mouse[0],mouse[1]);
            }
        },
        {
            title: 'Fact',
            action: function(d, event) { 
                // Create a new fact (rolebox group)
                var mouse = d3.pointer(event,event.target);
                draw_rolebox(mouse[0],mouse[1]);
              }
          }
    ];

var entityOptions =
    [
        {
            title: 'Properties',
            action: function(d, event) { 
                // Open popup
                popup_event(event);
                }
        },
        {
            title: 'Delete',
            action: function(d, event) { 
                // Delete entity
                remove_entity(event);
              }
          }
    ];

var roleboxOptions =
    [
        {
            title: 'Add Rolebox',
            action: function(d, event) {
                // Add rolebox to group
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return }
                // Add rolebox
                add_rolebox(rbgroup);
            }
        },
        {
            title: function(d, event) {
                /* Rotate 
                   Add a checkmark if fact is rotated. */
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                // Not sure what we clicked on? (catch-all)
                if (rbgroup == null) { return "Rotate" }
                // Rotated? Add check
                if ( rbgroup.datum().rotated == true ) {
                    return "Rotate &nbsp;&nbsp;&#x2713;"
                }
                return "Rotate"
            },
            action: function(d, event) {
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return }
                rotate_rolebox_group(rbgroup);
            }
        },
        {
            title: function(d, event) {
                /* Flip 
                   Add a checkmark if fact is flipped. */
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                // Not sure what we clicked on? (catch-all)
                if (rbgroup == null) { return "Flip" }
                // Flipped? Add check
                if ( rbgroup.datum().flipped == true ) {
                    return "Flip &nbsp;&nbsp;&#x2713;"
                }
                return "Flip"
            },
            action: function(d, event) {
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return }
                // Flip it
                flip_rolebox_group(rbgroup);
            }
        },
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
                if ( rbox.datum().mandatory == true ) {
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
                flip_mandatory_role(rbox);
            }
        },
        {
            title: 'Properties',
            action: function(d, event) { 
                popup_event(event);
                }
        },
        {
            title: 'Delete Last Rolebox',
            action: function(d, event) {
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return }
                // Determine last rolebox
                var boxes = [...rbgroup.datum().boxes];
                if (rbgroup.datum().flipped) { boxes.reverse(); }
                var rbox = d3.select("#"+boxes[boxes.length-1])
                // Delete rolebox
                delete_rolebox( rbox );
            }
        }
    ];

var connOptions =
    [
        {
            title: 'Delete',
            action: function(d, event) { 
                remove_connector(event);
            }
        }
    ];