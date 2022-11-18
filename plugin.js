module.exports.configure = function (on) {
    on('task', {
      writeCommands: (commands) => {
        console.log("Executed commands:")
        console.table(commands);
      }
    })
  }