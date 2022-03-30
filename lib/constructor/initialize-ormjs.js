/* Initialize ORMJS */

var ormjs = {};

ormjs.initialize = function(_callback) {

    ormjs.models = {};
    ormjs.highest_model_id = 0;
    
    ormjs.object_kinds = ["view", "constraint", "entity", "value", 
                          "connector", "rolebox", "predicate"];
    
    ormjs.tolerance = { link : {}, snap : {} };
    
    ormjs.default_dragevent = ["bottom","right","top","left"];
    
    // Display settings defaults
    ormjs.display = { 
        shortFormat: true,
        graphFormat: false
    };

    // Pull size data from stylesheet
    ormjs.initialize_global_sizes();

    // Load ormjs views embedded in the page
    ormjs.SVG.load_page(_callback);

}

ormjs.initialize_global_sizes = function() {

    ormjs.size = {
        entity: { height: ormjs.GraphUtils.get_css_number('--ojs-entity-height') },
        value: { height: ormjs.GraphUtils.get_css_number('--ojs-entity-height') },
        rolebox: { height: ormjs.GraphUtils.get_css_number('--ojs-rolebox-height'),
                   width: ormjs.GraphUtils.get_css_number('--ojs-rolebox-width')
        },
        constraint: { radius: ormjs.GraphUtils.get_css_number('--ojs-constraint-radius'),
                      oradius: ormjs.GraphUtils.get_css_number('--ojs-constraint-oradius'),
                      stroke: ormjs.GraphUtils.get_css_number('--ojs-stroke-width') 
        },
        connector: { wide_stroke: ormjs.GraphUtils.get_css_number('--ojs-stroke-width-wide'),
                     stroke: ormjs.GraphUtils.get_css_number('--ojs-stroke-width') 
        },
        view : { scale: ormjs.GraphUtils.get_css_number('--ojs-svg-scale'),
                 scale_min: ormjs.GraphUtils.get_css_number('--ojs-svg-scale-min'),
                 scale_max: ormjs.GraphUtils.get_css_number('--ojs-svg-scale-max')
    
        },
        popup: { width: ormjs.GraphUtils.get_css_number('--ojs-pop-width'),
                 height: ormjs.GraphUtils.get_css_number('--ojs-pop-height'),
                 stroke: ormjs.GraphUtils.get_css_number('--ojs-pop-stroke'),
                 hover_stroke: ormjs.GraphUtils.get_css_number('--ojs-pop-stroke-hover'),
                 close: ormjs.GraphUtils.get_css_number('--ojs-pop-close-sz'),
                 check: { x: ormjs.GraphUtils.get_css_number('--ojs-pop-ch-width'), 
                          y: ormjs.GraphUtils.get_css_number('--ojs-pop-ch-height'),
                          m: ormjs.GraphUtils.get_css_number('--ojs-pop-ch-marg') }
        }
    };

}