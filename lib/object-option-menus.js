var svgOptions =
    [
        {
            title: 'Entity',
            action: function(d, event) { 
                var mouse = d3.pointer(event,event.target);
                draw_entity(mouse[0],mouse[1]);
            }
        },
        {
            title: 'Rolebox',
            action: function(d, event) { 
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
                popup_event(event);
                }
        },
        {
            title: 'Delete',
            action: function(d, event) { 
                remove_entity(event);
              }
          }
    ];

var roleboxOptions =
    [
        {
            title: 'Add Rolebox',
            action: function(d, event) {
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return }
                add_rolebox(rbgroup);
            }
        },
        {
            title: function(d, event) {
                // Rotate
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return "Rotate" }
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
                // Flip
                // Get rolebox group
                var targetID = event.target.id.toString();
                var rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return "Flip" }
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
                flip_rolebox_group(rbgroup);
            }
        },
        {
            title: function(d, event) {
                // Mandatory
                // Get rolebox
                var targetID = event.target.id.toString();
                var rboxID = targetID.substring(2,targetID.length);
                var rbox = orm.roleboxes[ rboxID ];
                if (rbox == null) { return "Mandatory" }
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
                var boxes = [...rbgroup.datum().boxes];
                if (rbgroup.datum().flipped) { boxes.reverse(); }
                var rbox = d3.select("#"+boxes[boxes.length-1])
                delete_rolebox( rbox );
                //remove_rolebox(event);
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