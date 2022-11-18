module.exports.configure = function (on, config) {
  on('task', {
    console: (method, data) => {
      if (method === 'table') {
        console.table(data);
      } else
        if (method === 'log') {
          console.log(data);
        }
    }
  })

  return config;
}   
