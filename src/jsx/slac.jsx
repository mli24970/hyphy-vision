
require("./components/shared_summary.jsx");
require("./components/slac_sites.jsx");
require("./components/slac_summary.jsx");

var React = require('react');
var datamonkey = require('../datamonkey/datamonkey.js');

var SLAC = React.createClass({

  float_format : d3.format(".2f"),

  dm_loadFromServer : function() {
  /* 20160721 SLKP: prefixing all custom (i.e. not defined by REACT) with dm_
     to make it easier to recognize scoping immediately */

    var self = this;

    d3.json(self.props.url, function(request_error, data) {

        if (!data) {
            var error_message_text = request_error.status == 404 ? self.props.url + " could not be loaded" : request_error.statusText;
            self.setState ({error_message: error_message_text});
        } else {
            self.dm_initializeFromJSON (data);
        }
    });

  },


  dm_initializeFromJSON: function (data) {
      this.setState ({ analysis_results : data});
  },

  getDefaultProps: function() {
    /* default properties for the component */

    return {
        url : "#"
    };

  },

  getInitialState: function() {

    return {
              analysis_results : null,
              error_message: null,
              pValue : 0.1,
           };

  },

  componentWillMount: function() {
    this.dm_loadFromServer();
    this.dm_setEvents();
  },

  dm_setEvents : function() {

    var self = this;

    $("#datamonkey-json-file").on("change", function(e) {

        var files = e.target.files; // FileList object

        if (files.length == 1) {
            var f = files[0];
            var reader = new FileReader();



            reader.onload = (function(theFile) {
                return function(e) {
                  try {
                    self.dm_initializeFromJSON (JSON.parse(this.result));
                  }
                  catch (error) {
                    self.setState ({error_message : error.toString()});
                  }
                }
            })(f);

            reader.readAsText(f);
        }

        $("#datamonkey-json-file-toggle").dropdown("toggle");
    });


  },

  dm_adjustPvalue : function (event) {
    this.setState ({pValue: parseFloat(event.target.value)});
  },

  render: function() {

    var self = this;

    if (self.state.error_message) {
        return (
            <div id='datamonkey-error' className="alert alert-danger alert-dismissible" role="alert">
                <button type="button" className="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button>
                <strong>{self.state.error_message}</strong> <span id='datamonkey-error-text'></span>
            </div>
        );
    }

    if (self.state.analysis_results) {

        return (
           <div className="tab-content">
                <div className="tab-pane" id="summary_tab">

                    <div className="row">
                        <div id="summary-div" className="col-md-12">
                            <SLACBanner analysis_results={self.state.analysis_results} pValue={self.state.pValue} pAdjuster={_.bind (self.dm_adjustPvalue, self)}/>
                        </div>
                    </div>

                    <div className="row hidden-print">
                        <div id="datamonkey-slac-tree-summary" className="col-lg-4 col-md-6 col-sm-12">
                             <div className = "panel panel-default">
                                <div className="panel-heading">
                                    <h3 className="panel-title">
                                        <i className="fa fa-puzzle-piece"></i> Partition information
                                     </h3>
                                </div>
                                <div className="panel-body">
                                    <small>
                                        <DatamonkeyPartitionTable
                                            pValue={self.state.pValue}
                                            trees={self.state.analysis_results.trees}
                                            partitions={self.state.analysis_results.partitions}
                                            branchAttributes={self.state.analysis_results['branch attributes']}
                                            siteResults={self.state.analysis_results.MLE}
                                            accessorPositive={function (json, partition) {return _.map (json["content"][partition]["by-site"]["AVERAGED"], function (v) {return v[8];});}}
                                            accessorNegative={function (json, partition) {return _.map (json["content"][partition]["by-site"]["AVERAGED"], function (v) {return v[9];});}}
                                        />
                                    </small>
                                </div>
                            </div>
                       </div>
                        <div id="datamonkey-slac-model-fits" className="col-lg-5 col-md-6 col-sm-12">
                             <div className = "panel panel-default">
                                <div className="panel-heading">
                                    <h3 className="panel-title">
                                        <i className="fa fa-table"></i> Model fits
                                     </h3>
                                </div>
                                <div className="panel-body">
                                    <small>
                                        {<DatamonkeyModelTable fits={self.state.analysis_results.fits}/>}
                                    </small>
                                </div>
                            </div>
                        </div>
                        <div id="datamonkey-slac-timers" className="col-lg-3 col-md-3 col-sm-12">
                             <div className = "panel panel-default">
                                <div className="panel-heading">
                                    <h3 className="panel-title">
                                        <i className="fa fa-clock-o"></i> Execution time
                                     </h3>
                                </div>
                                <div className="panel-body">
                                    <small>
                                        <DatamonkeyTimersTable timers={self.state.analysis_results.timers} totalTime={"Total time"} />
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>


                    </div>

                    <div className='tab-pane active' id="sites_tab">
                        <div className="row">
                            <div id="summary-div" className="col-md-12">
                                <SLACSites
                                    headers={self.state.analysis_results.MLE.headers}
                                    mle={datamonkey.helpers.map (datamonkey.helpers.filter (self.state.analysis_results.MLE.content, function (value, key) {return _.has (value, "by-site");}),
                                               function (value, key) {return value["by-site"];})}
                                    sample25={self.state.analysis_results["sample-2.5"]}
                                    sampleMedian={self.state.analysis_results["sample-median"]}
                                    sample975={self.state.analysis_results["sample-97.5"]}
                                    partitionSites={self.state.analysis_results.partitions}
                                />
                            </div>
                        </div>
                    </div>

                    <div className='tab-pane' id="tree_tab">
                    </div>

            </div>
        );
        }
    return null;
  }

});



// Will need to make a call to this
// omega distributions
function render_slac(url, element) {
  ReactDOM.render(
    <SLAC url={url} />,
    document.getElementById(element)
  );
}
