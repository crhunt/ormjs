/* Initialize ORMJS */

var ormjs = {};

ormjs.initialize = function() {

    ormjs.models = {};
    ormjs.highest_model_id = 0;
    
    ormjs.object_kinds = ["view", "constraint", "entity", "value", 
                          "connector", "rolebox", "rolebox_group"];
    
    ormjs.tolerance = { link : {}, snap : {} };
    
    ormjs.default_dragevent = ["bottom","right","top","left"];
    
    // Display settings defaults
    ormjs.display = { 
        shortFormat: true,
        graphFormat: false
    };

    ormjs.initialize_global_sizes();

}

ormjs.initialize_global_sizes = function() {

    ormjs.size = {
        entity: { height: ormjs.GraphUtils.get_css_number('--entity-height') },
        value: { height: ormjs.GraphUtils.get_css_number('--entity-height') },
        rolebox: { height: ormjs.GraphUtils.get_css_number('--rolebox-height'),
                   width: ormjs.GraphUtils.get_css_number('--rolebox-width')
        },
        constraint: { radius: ormjs.GraphUtils.get_css_number('--constraint-radius'),
                      oradius: ormjs.GraphUtils.get_css_number('--constraint-oradius'),
                      stroke: ormjs.GraphUtils.get_css_number('--stroke-width') 
        },
        connector: { wide_stroke: ormjs.GraphUtils.get_css_number('--stroke-width-wide'),
                     stroke: ormjs.GraphUtils.get_css_number('--stroke-width') 
        },
        view : { scale: ormjs.GraphUtils.get_css_number('--svg-scale'),
                 scale_min: ormjs.GraphUtils.get_css_number('--svg-scale-min'),
                 scale_max: ormjs.GraphUtils.get_css_number('--svg-scale-max')
    
        },
        popup: { width: ormjs.GraphUtils.get_css_number('--pop-width'),
                 height: ormjs.GraphUtils.get_css_number('--pop-height'),
                 stroke: ormjs.GraphUtils.get_css_number('--pop-stroke'),
                 hover_stroke: ormjs.GraphUtils.get_css_number('--pop-stroke-hover'),
                 close: ormjs.GraphUtils.get_css_number('--pop-close-sz'),
                 check: { x: ormjs.GraphUtils.get_css_number('--pop-ch-width'), 
                          y: ormjs.GraphUtils.get_css_number('--pop-ch-height'),
                          m: ormjs.GraphUtils.get_css_number('--pop-ch-marg') }
        }
    };

}