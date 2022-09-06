/* Initialize ORMJS */

var ormjs = {};

ormjs.GraphUtils = class {

    /* General purpose utilities used for displaying the graph. */

    static remove_from_array(arr, v) {
        // Remove first instance of v from arr
        var index = arr.indexOf(v);
        if (index > -1) {
            arr.splice(index, 1);
        }
        return arr;
    }
    
    static key_from_value(obj, value) {
        return Object.keys(obj).find(key => obj[key] === value)
    }
    
    static range(size, startAt = 0) {
        /* Get a range of ints of length size starting at value startAt */
        return [...Array(size).keys()].map(i => i + startAt);
    }

    static get_css_variable(varname) {
        /* Pull css variables from any css file and return as a string. */
        return window.getComputedStyle(document.documentElement).getPropertyValue(varname)
    }
    
    static parse_number(mystring) {
        /* Parse mystring as an integer. */
        return parseInt( mystring.replace(/\D/g, "") )
    }

    static get_css_number(varname) {
        return ormjs.GraphUtils.parse_number(ormjs.GraphUtils.get_css_variable(varname))
    }

    static parent_node_id(id) {
        return d3.select( d3.select(`#${id}`).node().parentNode ).node().id;
    }

}

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

ormjs.models = {};
ormjs.highest_model_id = 0;

ormjs.object_kinds = ["view", "constraint", "entity", "value", 
                        "connector", "rolebox", "predicate"];

ormjs.default_dragevent = ["bottom","right","top","left"];

// Display settings defaults
ormjs.display = { 
    shortFormat: true,
    graphFormat: false
};

ormjs.tolerance = { link : {}, snap : {}, f: 0.4 };

ormjs.tolerance.link = {
    entity: 2*ormjs.size.entity.height,
    value: 2*ormjs.size.value.height,
    rolebox: ormjs.size.rolebox.width,
    constraint: ormjs.size.constraint.oradius,
    connector: ormjs.size.connector.wide_stroke
};

ormjs.tolerance.snap = {
    entity: ormjs.tolerance.f*ormjs.size.entity.height/10,
    value: ormjs.tolerance.f*ormjs.size.value.height/10,
    rolebox: ormjs.tolerance.f*ormjs.size.rolebox.width/10,
    predicate: ormjs.tolerance.f*ormjs.size.rolebox.width/10,
    constraint: ormjs.size.constraint.radius/5
};

ormjs.reinitialize = function(_callback) {

    ormjs.models = {};
    ormjs.highest_model_id = 0;
    
    ormjs.default_dragevent = ["bottom","right","top","left"];
    
    // Display settings defaults
    ormjs.display = { 
        shortFormat: true,
        graphFormat: false
    };

}
