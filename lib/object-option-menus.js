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
          title: 'Delete',
          action: function(d, event) { 
              console.log(event)
              remove_entity(event);
            }
        }
    ];

var roleboxOptions =
    [
        {
            title: 'Delete',
            action: function(d, event) {
                remove_rolebox(event);
            }
        },
        {
            title: 'Rotate',
            action: function(d, event) {
                var targetID = event.target.id.toString();
                rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return }
                rotate_rolebox_group(rbgroup);
            }
        },
        {
            title: 'Flip',
            action: function(d, event) {
                var targetID = event.target.id.toString();
                rbgroup = orm.rbgroups[ get_rbgroupID(targetID) ];
                if (rbgroup == null) { return }
                flip_rolebox_group(rbgroup);
            }
        }
    ];