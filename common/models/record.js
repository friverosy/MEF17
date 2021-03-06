/* TYPE:
PDA = Online,
MR = Manual Record,
CT = Closed of turn,
PEN = from pendings view, manual record with input & output datetime

State:
DO = Double Output,

Reviewed:
false = showable on manuals view to mark as reviewed
true = dont showable on manuals view (admin mark as reviewed)
*/

var colors = require('colors');
var Promise = require('bluebird');
var app = require('../../server/server');
var Slack = require('slack-node');

module.exports = function(Record) {
  // Remove DELETE functionality from API
  Record.disableRemoteMethod('deleteById', true);
  // Validate unique
  // Record.validatesUniquenessOf('input_datetime', {message: 'Entry Already exist'});
  // Record.validatesUniquenessOf('output_datetime', {message: 'Depart Already exist'});

  Record.observe('before save', function(ctx, next) {
    if (ctx.instance) {
      //console.log(ctx.instance);
      ctx.instance.reviewed = true;

      // Update last input as output, add output_datetime send from android.
      if (ctx.instance.is_input) {
        findLastOutput(ctx.instance)
        .then(id => saveOutput(id, ctx.instance))
        .catch(err => catcher(err, ctx.instance));
      } else {
        findLastInput(ctx.instance)
        .then(id => saveOutput(id, ctx.instance))
        .catch(err => catcher(err, ctx.instance));
      }
    }
    next();
  });

  function findLastOutput(ctx) {
    return new Promise(function (resolve, reject) {
      Record.find( {
        where: {
          and: [
            {run: ctx.run},
            {is_input: false}
          ]
        },
        order: 'id DESC',
        limit: 1
      },
      function (err, recordFinded) {
        if (err) { reject(err); }
        if (recordFinded.length > 0) {
          resolve();
        } else {
          reject();
        }
      });}
    );
  }

  function findLastInput(ctx) {
    return new Promise(function (resolve, reject) {
      Record.find( {
        where: {
          and: [{
            run: ctx.run,
            is_input: true
          }]
        },
        order: 'id ASC'
      },
      function (err, data) {
        if (err) { reject(err); }
        if (data.length > 0) {
          for (var record in data){
            // console.log('record', record);
            // console.log('data', data.length - 1);
            if (record == data.length-1) {
              saveOutput(data[record].id, ctx);
            } else {
              var dataDate = new Date(data[record].input_datetime);
              var registerDate = new Date(ctx.output_datetime);
              var dataDay = dataDate.getDate();
              var registerDay = registerDate.getDate();
              if (dataDay == registerDay) {
                  setOutput(data[record].id);
              }
            }
          }
          resolve();
        } else {
          // console.log('entrada no encontrada');
          resolve(0);
        }
      });}
    );
  }

  function setOutput(id) {
    Record.updateAll(
      { id: id },
      { is_input: false },
      function(err) {
        if (err) { console.error(err); }
        else {
          // console.log(id, "Actualizado");
        }
      }
    );
  }

  function saveOutput(id, ctx){
    return new Promise(function (resolve, reject) {
      // console.log('identificador', id);
      if (id === 0) {
        // Double output.
        // console.log('doble salida');
        reject(0);
      } else if (id === 1) {
        // Double input.
        // console.log('doble entrada');
        reject(1);
      } if (id !== undefined) {
        // console.log('entra aca');
        Record.updateAll(
          { id: id },
          { output_datetime: ctx.output_datetime, is_input: false },
          function (err) {
            if (err) { reject(err); }
            else {
              resolve();
            }
          }
        ); 
      } else {
        // console.log('normal')
        resolve(); // Do nothing
      }
    });
  }

  function catcher(err, ctx){
    if (err === 0) {
      // DO = Double output
      ctx.status = 'DO';
    } else if (err === 1) {
      // DO = Double input
      ctx.status = 'DI';
    }
    // console.log('modificado a', ctx.status);
  }

  function onBlacklist(ctx) {
    return new Promise(function (resolve, reject) {
      var Blacklist = app.models.Blacklist;
      Blacklist.findOne({
        where: {
          run: ctx.run
        }
      },
      function (err, recordFinded) {
        if (err) { reject(err); }
        if (recordFinded !== null) {
          resolve(ctx.id);
        } else {
          resolve(0);
        }
      });}
    );
  }

  function setBlacklist(id) {
    return new Promise(function (resolve, reject) {
      if (id !== 0) {
        Record.updateAll(
          { id: id },
          { blacklist: true },
          function(err) {
            if (err) { reject(err); }
            else { resolve(); }
          }
        );
      }
    });
  }

  function deleteRecord(id){
    // console.log('borrando', id);
    Record.destroyById(id, function(err){
      if (err) {
        console.log(err);
      }
    });
  }

  function updateFullname(run, newName) {
    var People = app.models.People;
    People.updateAll(
      { run: run },
      { fullname: newName },
      function(err, info) {
        if (err) { console.error(err); }
      }
    );
    Record.updateAll(
      { run: run},
      { fullname: newName },
      function(err, info) {
        if (err) { console.error(err); }
      }
    );
  }

  function sendSlackMessage(run, fullname, message){
    var slack = new Slack();
    slack.setWebhook('https://hooks.slack.com/services/'+
    'T1XCBK5ML/B24FS68C8/bNGkYEzjlhQbu2E1LLtr9TJ0');
    slack.webhook({
      channel: '#multiexportfoods',
      username: 'Multi-Boot',
      text: message,
      icon_emoji: ':robot_face:',
      attachments: [
        {
          'title': run + ' - ' + fullname,
          'color': 'danger'
        }
      ]
    }, function(err, response) {});
  }

  function notification(is_permitted, run, fullname, blacklist) {
    if (is_permitted === false)
      sendSlackMessage(run, fullname, 'Person dennied detected!.');
    if (blacklist === true)
      sendSlackMessage(run, fullname, 'Person blacklist detected!.');
  }

  Record.observe('after save', function(ctx, next) {
    if (ctx.instance) {
      if(ctx.instance.updating !== undefined && ctx.instance.updating !== ''){
        if(ctx.instance.profile === 'V'){
            var People = app.models.People;
            People.upsertWithWhere(
            { run: ctx.instance.run },
            { fullname: ctx.instance.fullname,
             company: ctx.instance.company,
             run: ctx.instance.run,
             is_permitted: true,
             profile: ctx.instance.profile },
            function(err, model) {
                  if (err) { console.log(err); }
                  //else if (model) console.log('Visit Updated'.green, model);
               }
            );
        }
      }


      // find duplicate register.
      Record.find({
        where: {
          and: [
            {run: ctx.instance.run},
            {input_datetime: ctx.instance.input_datetime}
          ]
        }
      }, function(err, data) {
        if (data.length > 1) {
          // TODO: si es salida sin entrada no borrar
          if (ctx.instance.status !== 'DO') {
            deleteRecord(data[data.length - 1].id);
          }
        }
      });


      if (ctx.instance.input_datetime === undefined &&
        ctx.instance.is_input === false &&
        ctx.instance.updating === undefined) {
        if (ctx.instance.status === 'DO') {
          saveOutput(ctx.instance.id, ctx.instance);
        } else if (ctx.instance.status === 'DI') {
          // do nothing
        } else {
          // console.log('borrando', ctx.instance);
          // deleteRecord(ctx.instance.id);
        }
      } else {
        onBlacklist(ctx.instance)
        .then(id => setBlacklist(id))
        .catch(err => console.log('Error onBlacklist', err));
      }
    }
    next();
  });

  // Closed of turn, mark as output (is_input=false)
  // each record with more than 12 hours without output.
  Record.closedTurn = function(msg, cb) {
    //console.log('cierre turno activado');
    var workday = 30 * 24 * 60 * 1000; // 12 Hours in milliseconds
    var date = new Date();
    var now = date.getTime();
    Record.updateAll(
      {and: [
        {input_datetime: {lt: now - workday}},
        {output_datetime: undefined}
      ]},
      {is_input: false, type: 'CT'},
      function(err, info) {
        if (err) {
          cb(null, 500);
        } else {
          cb(null, 200);
        }
      }
    );
  };

  Record.remoteMethod(
    'closedTurn',
    {
      accepts: {arg: 'profile', type: 'string', required: false},
      returns: {arg: 'status', type: 'number'},
      http: {path: '/closedTurn', verb: 'get'}
    }
  );
};
