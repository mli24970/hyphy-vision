var React = require('react');
var datamonkey = require('../../datamonkey/datamonkey.js');
require('phylotree');

var Tree = React.createClass({

  getDefaultProps : function() {

    return { 
              color_gradient : ["#5e4fa2", "#3288bd", "#e6f598", "#f46d43", "#9e0142"],
              grayscale_gradient : ["#DDDDDD", "#AAAAAA", "#888888", "#444444", "#000000"],
              fill_color : true,
              scaling_exponent : 0.33,
              bar_width : 70,
              bar_height : 300,
              margins : {
                'bottom': 30,
                'top': 15,
                'left': 40,
                'right': 2
              }
           };
  },

  changeColorScale : function(e) {

    var self = this;
    var fill_color = !e.target.checked;

    var omega_color = d3.scale.pow().exponent(self.props.scaling_exponent)
        .domain([0, 0.25, 1, 5, 10])
        .range(fill_color
               ? self.props.color_gradient
               : self.props.grayscale_gradient)
        .clamp(true);

    var omega_scale = d3.scale.pow().exponent(self.props.scaling_exponent)
        .domain(d3.extent(omega_color.domain()))
        .range([0, 1]);

    this.setState({
      omega_color: omega_color,
      omega_scale : omega_scale,
      fill_color:false
    });

  },

  getInitialState: function() {

    var self = this;

    var omega_color = d3.scale.pow().exponent(self.props.scaling_exponent)
        .domain([0, 0.25, 1, 5, 10])
        .range(self.props.fill_color
               ? self.props.color_gradient
               : self.props.grayscale_gradient)
        .clamp(true);

    var omega_scale = d3.scale.pow().exponent(self.props.scaling_exponent)
        .domain(d3.extent(omega_color.domain()))
        .range([0, 1]),
        axis_scale = d3.scale.pow().exponent(self.props.scaling_exponent)
        .domain(d3.extent(omega_color.domain()))
        .range([0, self.props.bar_height - self.props.margins['top'] - self.props.margins['bottom']]);


    return { 
              json : this.props.json,
              settings : this.props.settings,
              fill_color : this.props.fill_color,
              omega_color : omega_color,
              omega_scale : omega_scale,
              axis_scale : axis_scale
           };
  },

  sortNodes : function(asc) {

      var self = this;

      self.tree.traverse_and_compute(function(n) {
          var d = 1;
          if (n.children && n.children.length) {
              d += d3.max(n.children, function(d) {
                  return d["count_depth"];
              });
          }
          n["count_depth"] = d;
      });

      self.tree.resort_children(function(a, b) {
          return (a["count_depth"] - b["count_depth"]) * (asc ? 1 : -1);
      });

  },

  getBranchLengths : function() {

      var self = this;

      if(!this.state.json) {
        return [];
      }

      var branch_lengths = self.settings["tree-options"]["hyphy-tree-branch-lengths"][0] 
                           ? this.state.json["fits"][this.which_model]["branch-lengths"] : null;

      if(!branch_lengths) {

        var nodes = _.filter(self.tree.get_nodes(), function(d) { return d.parent });

        branch_lengths = _.object(
              _.map(nodes, function(d){ return d.name }), 
              _.map(nodes, function(d) { return parseFloat(d.attribute) })
            );

      }

      return branch_lengths;

  },

  assignBranchAnnotations : function() {
    if(this.state.json && this.state.json["fits"][this.which_model]) {
      this.tree.assign_attributes(this.state.json["fits"][this.which_model]["branch-annotations"]);
    }
  },

  renderDiscreteLegendColorScheme : function(svg_container) {

    var self = this,
        svg = self.svg;

    var color_fill = self.settings["tree-options"]["hyphy-tree-fill-color"][0] ? "black" : "red";

    var margins = {
          'bottom': 30,
          'top': 15,
          'left': 40,
          'right': 2
        };


    d3.selectAll("#color-legend").remove();

    var dc_legend = svg.append("g")
          .attr("id", "color-legend")
          .attr("class", "dc-legend")
          .attr("transform", "translate(" + margins["left"] + "," + margins["top"] + ")");

    var fg_item = dc_legend.append("g")
      .attr("class","dc-legend-item")
      .attr("transform", "translate(0,0)")

      fg_item.append("rect")
        .attr("width", "13")
        .attr("height", "13")
        .attr("fill", color_fill)

      fg_item.append("text")
        .attr("x", "15")
        .attr("y", "11")
        .text("Foreground")

    var bg_item = dc_legend.append("g")
      .attr("class","dc-legend-item")
      .attr("transform", "translate(0,18)")

      bg_item.append("rect")
        .attr("width", "13")
        .attr("height", "13")
        .attr("fill", "gray")

      bg_item.append("text")
        .attr("x", "15")
        .attr("y", "11")
        .text("Background")

  },

  renderLegendColorScheme: function(svg_container, attr_name, do_not_render) {

    var self = this;
    var branch_annotations = this.state.json["fits"][this.which_model]["branch-annotations"];
    var svg = self.svg;

    if(!self.state.omega_color || !self.state.omega_scale) {
      return;
    }

    // clear existing linearGradients
    d3.selectAll(".legend-definitions").selectAll("linearGradient").remove();
    d3.selectAll("#color-legend").remove();

    if (branch_annotations && !do_not_render) {

        var this_grad = svg.append("defs")
            .attr("class", "legend-definitions")
            .append("linearGradient")
              .attr("id", "_omega_bar")
              .attr("x1", "0%")
              .attr("y1", "0%")
              .attr("x2", "0%")
              .attr("y2", "100%");

        self.state.omega_color.domain().forEach(function(d) {
            this_grad.append("stop")
                .attr("offset", "" + self.state.omega_scale(d) * 100 + "%")
                .style("stop-color", self.state.omega_color(d));
        });

        var g_container = svg.append("g")
              .attr("id", "color-legend")
              .attr("transform", "translate(" + self.props.margins["left"] + "," + self.props.margins["top"] + ")");

        g_container.append("rect").attr("x", 0)
            .attr("width", self.props.bar_width - self.props.margins['left'] - self.props.margins['right'])
            .attr("y", 0)
            .attr("height", self.props.bar_height - self.props.margins['top'] - self.props.margins['bottom'])
            .style("fill", "url(#_omega_bar)");


        var draw_omega_bar = d3.svg.axis().scale(self.state.axis_scale)
            .orient("left")
            .tickFormat(d3.format(".1r"))
            .tickValues([0, 0.01, 0.1, 0.5, 1, 2, 5, 10]);

        var scale_bar = g_container.append("g");

        scale_bar.style("font-size", "14")
            .attr("class", "hyphy-omega-bar")
            .call(draw_omega_bar);

        scale_bar.selectAll("text")
            .style("text-anchor", "right");

        var x_label = scale_bar.append("g").attr("class", "hyphy-omega-bar");

        x_label = x_label.selectAll("text").data([attr_name]);
        x_label.enter().append("text");
        x_label.text(function(d) {
            return $('<textarea />').html(d).text();
        }).attr("transform", "translate(" + (self.props.bar_width - self.props.margins['left'] - self.props.margins['right']) * 0.5 + "," + (self.props.bar_height - self.props.margins['bottom']) + ")")
          .style("text-anchor", "middle")
          .style("font-size", "18")
          .attr("dx", "0.0em")
          .attr("dy", "0.1em");
    }
  },

  setHandlers : function() {

      var self = this;


      $("#hyphy-error-hide").on("click", function(e) {
          d3.select("#hyphy-error").style("display", "none");
          e.preventDefault();
      });

      $(".hyphy-tree-trigger").on("click", function(e) {
      });

      $(".tree-tab-btn").on('click', function(e) {
        self.tree.placenodes().update();
      });

      $("#export-phylo-svg").on('click', function(e) {
          datamonkey.save_image("svg", "#tree_container");
      });

      $("#export-phylo-png").on('click', function(e) {
          datamonkey.save_image("png", "#tree_container");
      });

      $("#export-phylo-nwk").on('click', function(e) {
        var nwk = self.tree.get_newick(function(){});
        var pom = document.createElement('a');
        pom.setAttribute('href', 'data:text/octet-stream;charset=utf-8,' + encodeURIComponent(nwk));
        pom.setAttribute('download', 'nwk.txt');
        $("body").append(pom);
        pom.click();
        pom.remove();
      });


  },

  setTreeHandlers : function() {

    var self = this;
    var tree_object = self.tree;

    $("[data-direction]").on("click", function(e) {
        var which_function = $(this).data("direction") == 'vertical' ? tree_object.spacing_x : tree_object.spacing_y;
        which_function(which_function() + (+$(this).data("amount"))).update();
    });


    $(".phylotree-layout-mode").on("change", function(e) {
        if ($(this).is(':checked')) {
            if (tree_object.radial() != ($(this).data("mode") == "radial")) {
                tree_object.radial(!tree_object.radial()).placenodes().update();
            }
        }
    });

    $(".phylotree-align-toggler").on("change", function(e) {
        if ($(this).is(':checked')) {
            if (tree_object.align_tips($(this).data("align") == "right")) {
                tree_object.placenodes().update();
            }
        }
    });

    $("#sort_original").on("click", function(e) {
        tree_object.resort_children(function(a, b) {
            return a["original_child_order"] - b["original_child_order"];
        });

        e.preventDefault();

    });

    $("#sort_ascending").on("click", function(e) {
        self.sortNodes(true);
        e.preventDefault();
    });

    $("#sort_descending").on("click", function(e) {
        self.sortNodes(false);
        e.preventDefault();
    });


  },

  setPartitionList : function() {

    var self = this;

    // Check if partition list exists
    if(!self.props.json["partition"]) {
      d3.select("#hyphy-tree-highlight-div").style("display", "none");
      d3.select("#hyphy-tree-highlight").style("display", "none");
      return;
    }

    // set tree partitions
    self.tree.set_partitions(self.props.json["partition"]);

    var partition_list = d3.select("#hyphy-tree-highlight-branches").selectAll("li").data([
        ['None']
    ].concat(d3.keys(self.props.json["partition"]).map(function(d) {
        return [d];
    }).sort()));

    partition_list.enter().append("li");
    partition_list.exit().remove();
    partition_list = partition_list.selectAll("a").data(function(d) {
        return d;
    });

    partition_list.enter().append("a");
    partition_list.attr("href", "#").on("click", function(d, i) {
        d3.select("#hyphy-tree-highlight").attr("value", d);
    });

    // set default to passed setting
    partition_list.text(function(d) {
        if (d == "RELAX.test") {
            this.click();
        }
        return d;
    });

  },

  setModelList : function() {

    if(!this.state.json) {
      return [];
    }

    this.state.settings['suppress-tree-render'] = true;

    var def_displayed = false;

    var model_list = d3.select("#hyphy-tree-model-list").selectAll("li").data(d3.keys(this.state.json["fits"]).map(function(d) {
        return [d];
    }).sort());

    model_list.enter().append("li");
    model_list.exit().remove();
    model_list = model_list.selectAll("a").data(function(d) {
        return d;
    });

    model_list.enter().append("a");

    model_list.attr("href", "#").on("click", function(d, i) {
      d3.select("#hyphy-tree-model").attr("value", d);
    });


    model_list.text(function(d) {

        if (d == "General Descriptive") {
            def_displayed = true;
            this.click();
        }

        if (!def_displayed && d == "Alternative") {
            def_displayed = true;
            this.click();
        }

        if (!def_displayed && d == "Partitioned MG94xREV") {
            def_displayed = true;
            this.click();
        }

        if (!def_displayed && d == "MG94") {
            def_displayed = true;
            this.click();
        }

        if (!def_displayed && d == "Full model") {
            def_displayed = true;
            this.click();
        }

        return d;

    });

    this.settings['suppress-tree-render'] = false;

  },

  initialize : function() {

    this.settings = this.state.settings;

    if(!this.settings) {
      return null;
    }

    if(!this.state.json) {
      return null;
    }

    $("#hyphy-tree-branch-lengths").click();

    this.scaling_exponent = 0.33;
    this.omega_format = d3.format(".3r");
    this.prop_format = d3.format(".2p");
    this.fit_format = d3.format(".2f");
    this.p_value_format = d3.format(".4f");

    this.width = 800;
    this.height = 600;

    this.which_model = this.settings["tree-options"]["hyphy-tree-model"][0];
    this.legend_type = this.settings["hyphy-tree-legend-type"];

    this.setHandlers();
    this.setModelList();
    this.initializeTree();
    this.setPartitionList();

  },

  initializeTree : function() {

    var self = this;

    var analysis_data = self.state.json;

    var width = this.width,
        height = this.height;

    if(!this.tree) {
      this.tree = d3.layout.phylotree("body")
          .size([height, width])
          .separation(function(a, b) {
              return 0;
          });
    }

    this.setTreeHandlers();

    // clear any existing svg
    d3.select("#tree_container").html("");

    this.svg = d3.select("#tree_container").append("svg")
        .attr("width", width)
        .attr("height", height);

    this.tree.branch_name(null);
    this.tree.node_span('equal');
    this.tree.options({
        'draw-size-bubbles': false,
        'selectable': false,
        'left-right-spacing': 'fit-to-size',
        'left-offset': 100,
        'color-fill': this.settings["tree-options"]["hyphy-tree-fill-color"][0]
    }, false);

    this.assignBranchAnnotations();

    if(_.indexOf(_.keys(analysis_data), "tree") > -1) {
      self.tree(analysis_data["tree"]).svg(self.svg);
    } else {
      self.tree(analysis_data["fits"][self.which_model]["tree string"]).svg(self.svg);
    }

    self.branch_lengths = this.getBranchLengths();
    self.tree.font_size(18);
    self.tree.scale_bar_font_size(14);
    self.tree.node_circle_size(0);

    self.tree.branch_length(function(n) {
        if (self.branch_lengths) {
            return self.branch_lengths[n.name] || 0;
        }
        return undefined;
    });

    this.assignBranchAnnotations();


    if (self.legend_type == 'discrete') {
      self.renderDiscreteLegendColorScheme("tree_container");
    } else {
      self.renderLegendColorScheme("tree_container", analysis_data["fits"][this.which_model]["annotation-tag"]);
    }


    if(this.settings.edgeColorizer) {
      this.edgeColorizer = _.partial(this.settings.edgeColorizer, _, _, self.state.omega_color);
    }


    this.tree.style_edges(this.edgeColorizer);
    this.tree.style_nodes(this.nodeColorizer);

    this.tree.spacing_x(30, true);
    this.tree.layout();
    this.tree.placenodes().update();
    this.tree.layout();

  },

  componentDidMount: function() {
    this.initialize();
  },

  componentWillReceiveProps: function(nextProps) {

    this.setState({
                    json : nextProps.json,
                    settings : nextProps.settings
                  });

  },

  componentDidUpdate : function() {
    this.initialize();
  },

  render: function() {

    return (
        <div>
        <h4 className="dm-table-header">
          Fitted tree
          <span className="glyphicon glyphicon-info-sign" style={{"verticalAlign": "middle", "float":"right"}} aria-hidden="true" data-toggle="popover" data-trigger="hover" title="Actions" data-html="true" data-content="<ul><li>Hover over a branch to see its inferred rates and significance for selection.</li><ul>" data-placement="bottom"></span>

        </h4>
          <div className='row'>
              <div className="col-md-12">
                  <div className="input-group input-group-sm">
                      <div className="input-group-btn">
                            <button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown">Export<span className="caret"></span></button>
                            <ul className="dropdown-menu">
                              <li id="export-phylo-png"><a href="#"><i className="fa fa-image"></i> Image</a></li>
                              <li id="export-phylo-nwk"><a href="#"><i className="fa fa-file-o"></i> Newick File</a></li>
                            </ul>
                          <button type="button" className="btn btn-default btn-sm" data-direction="vertical" data-amount="1" title="Expand vertical spacing">
                              <i className="fa fa-arrows-v"></i>
                          </button>
                          <button type="button" className="btn btn-default btn-sm" data-direction="vertical" data-amount="-1" title="Compress vertical spacing">
                              <i className="fa  fa-compress fa-rotate-135"></i>
                          </button>
                          <button type="button" className="btn btn-default btn-sm" data-direction="horizontal" data-amount="1" title="Expand horizonal spacing">
                              <i className="fa fa-arrows-h"></i>
                          </button>
                          <button type="button" className="btn btn-default btn-sm" data-direction="horizontal" data-amount="-1" title="Compress horizonal spacing">
                              <i className="fa  fa-compress fa-rotate-45"></i>
                          </button>
                          <button type="button" className="btn btn-default btn-sm" id="sort_ascending" title="Sort deepest clades to the bototm">
                              <i className="fa fa-sort-amount-asc"></i>
                          </button>
                          <button type="button" className="btn btn-default btn-sm" id="sort_descending" title="Sort deepsest clades to the top">
                              <i className="fa fa-sort-amount-desc"></i>
                          </button>
                          <button type="button" className="btn btn-default btn-sm" id="sort_original" title="Restore original order">
                              <i className="fa fa-sort"></i>
                          </button>
                      </div>
                      <div className="input-group-btn" data-toggle="buttons">
                          <label className="btn btn-default active btn-sm">
                              <input type="radio" name="options" className="phylotree-layout-mode" data-mode="linear" autoComplete="off" checked="" title="Layout left-to-right"></input>Linear
                          </label>
                          <label className="btn btn-default  btn-sm">
                              <input type="radio" name="options" className="phylotree-layout-mode" data-mode="radial" autoComplete="off" title="Layout radially"></input> Radial
                          </label>
                      </div>
                      <div className="input-group-btn" data-toggle="buttons">
                        <label className="btn btn-default active btn-sm">
                          <input type="radio" className="phylotree-align-toggler" data-align="left" name="options-align" autoComplete="off" checked="" title="Align tips labels to branches"></input> 
                              <i className="fa fa-align-left"></i>
                        </label>
                        <label className="btn btn-default btn-sm">
                         <input type="radio" className="phylotree-align-toggler" data-align="right" name="options-align" autoComplete="off" title="Align tips labels to the edge of the plot"></input> 
                              <i className="fa fa-align-right"></i>
                        </label>
                      </div>
      
                      <div className="input-group-btn">
                          <button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown">Model
                              <span className="caret"></span></button>
                          <ul className="dropdown-menu" id="hyphy-tree-model-list">
                          </ul>
                      </div>

                      <input type="text" className="form-control disabled" id="hyphy-tree-model" disabled></input>


                      <div id="hyphy-tree-highlight-div" className="input-group-btn">
                          <button type="button" className="btn btn-default dropdown-toggle" data-toggle="dropdown">Highlight branch set
                              <span className="caret"></span></button>
                          <ul className="dropdown-menu" id="hyphy-tree-highlight-branches">
                          </ul>
                      </div>

                      <input type="text" className="form-control disabled" id="hyphy-tree-highlight" disabled></input>

                      <span className="input-group-addon">
                        Use model branch lengths
                        <input type="checkbox" id="hyphy-tree-branch-lengths" className = "hyphy-tree-trigger"></input>
                      </span>

                      <span className="input-group-addon">
                        Hide legend
                        <input type="checkbox" id="hyphy-tree-hide-legend" className = "hyphy-tree-trigger"></input>
                      </span>

                      <span className="input-group-addon">
                        Grayscale 
                        <input type="checkbox" id="hyphy-tree-fill-color" className="hyphy-tree-trigger" defaultChecked={!this.props.fill_color} onChange={this.changeColorScale}></input>
                      </span>

                  </div>
              </div>
          </div>
          <div className="row">
              <div className="col-md-12">
                  <div className="row">
                      <div id="tree_container" className="tree-widget"></div>
                  </div>
              </div>
          </div>
        </div>

      )
  }

});

function render_tree(json, element, settings) {
  return React.render (
    <Tree json={json} settings={settings} />,
    $(element)[0]
  );
}

function rerender_tree(json, element, settings) {
  $(element).empty();
  return render_tree(json, settings);
}


module.exports.Tree = Tree;
module.exports.render_tree = render_tree;
module.exports.rerender_tree = rerender_tree;
