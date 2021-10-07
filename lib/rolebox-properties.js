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