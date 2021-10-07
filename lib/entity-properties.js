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