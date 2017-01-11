// Dependencies

const ncu = require('npm-check-updates');
const inquirer = require('inquirer');
const chalk = require('chalk');
const _ = require('lodash');
const emoji = require('node-emoji').emoji;
const spawn = require( 'child_process' ).spawn;

// Convenience Operators
const log = console.log;

function exit(code) {
  process.exit(code || 0);
}

// Inquirer Helpers
function sequence(tasks) {
  var length = tasks.length;
  var current = Promise.resolve();
  var results = new Array(length);

  for (var i = 0; i < length; ++i) {
    current = results[i] = current.then(tasks[i]);
  }

  return Promise.all(results);
};

function showRepositoryOptions(pkg, newVersion) {
  return function() {
    log(chalk.bgYellow(chalk.black(`Package ${pkg} can be upgraded to version ${newVersion}.`)));
    return new Promise((resolve) => {
      function doConfirm() {
        inquirer.prompt([
          {
            type: 'list',
            name: 'repoOptions',
            message: `What do you want to do with on ${pkg}?`,
            choices: ['View Repository', `Upgrade to Version ${newVersion}`]
          }
        ]).then((answer) => {
          switch(answer.repoOptions) {
            case 'View Repository':
              spawn('npm', [ 'repo', pkg ]);
              doConfirm();
              break;
            case `Upgrade to Version ${newVersion}`:
              resolve();
          }
        });
      }

      doConfirm();
    });
  }
}

function promptUpgrades(outdatedPkgs) {
  var prompts = [];

  for (pkg in outdatedPkgs) {
    prompts.push(showRepositoryOptions(pkg, outdatedPkgs[pkg]));
  }

  return sequence(prompts);
}


ncu.run({
  packageFile: 'package.json',
  silent: true,
  jsonUpgraded: true,
}).then((outdatedPkgs) => {
  if (_.isEmpty(outdatedPkgs)) {
    log(chalk.green(`Nice work ${emoji.tada}. You're all up to date!`));
    exit();
  }

  log(chalk.white(`${_.size(outdatedPkgs)} package(s) are out of date.`));
  
  promptUpgrades(outdatedPkgs).then(() => {
    exit();
  })
});