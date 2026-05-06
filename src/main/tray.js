const { Menu, Tray } = require('electron');

function createTrayController({
  getAppIcon,
  getMainWindow,
  showMainWindow,
  triggerHaikuNow,
  sendToRenderer
}) {
  let tray = null;

  function create() {
    if (tray) return tray;

    tray = new Tray(getAppIcon().resize({ width: 16, height: 16 }));
    tray.setToolTip('Daily Haiku');

    const menu = Menu.buildFromTemplate([
      { label: 'Show Haiku', click: showMainWindow },
      { label: 'Next Haiku Now', click: () => triggerHaikuNow() },
      { type: 'separator' },
      {
        label: 'Settings',
        click: () => {
          showMainWindow();
          sendToRenderer('open-settings');
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          const { app } = require('electron');
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setContextMenu(menu);
    tray.on('click', () => {
      const windowRef = getMainWindow();
      if (windowRef && windowRef.isVisible()) {
        windowRef.hide();
        return;
      }

      showMainWindow();
    });

    return tray;
  }

  return {
    create,
    getTray: () => tray
  };
}

exports.createTrayController = createTrayController;
