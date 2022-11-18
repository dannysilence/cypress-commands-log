module.exports.configure = function (on) {
    on('task', {
      console: (method, data) => {
        if(method === 'table') {
            console.table(data);
        } else 
        if(method === 'log') {
            console.log(data);
        }
      }
    })
  }
