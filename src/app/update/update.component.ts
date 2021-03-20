import { Component, EventEmitter, NgZone, OnInit, Output } from '@angular/core';
import { ElectronService } from 'ngx-electron';

import { AppService } from '../app.service';
import { UpdateDownloadProgress, UpdateError } from '../model';
import { NotificationService } from '../notification/notification.service';
import { SystemService } from '../services/system/system.service';

@Component({
  selector: 'app-update',
  templateUrl: './update.component.html',
  styleUrls: ['./update.component.scss'],
})
export class UpdateComponent implements OnInit {
  @Output() closeFunction = new EventEmitter<void>(true);

  private installationAnimationInterval: ReturnType<typeof setInterval>;
  public updateProgress: UpdateDownloadProgress = {
    percentage: 0,
    transferred: 0,
    total: '--.-',
    remaining: 0,
    eta: '--:--',
    runtime: '--:--',
    delta: 0,
    speed: '--.-',
  };
  public page = 1;

  constructor(
    public service: AppService,
    private notificationService: NotificationService,
    private systemService: SystemService,
    private zone: NgZone,
    private electronService: ElectronService,
  ) {}

  ngOnInit(): void {
    if (!this.service.getLatestVersion() || !this.service.getLatestVersionAssetsURL()) {
      this.notificationService.setWarning(
        "Can't initiate update!",
        'Some information is missing, please try again in an hour or update manually.',
      );
      this.closeUpdateWindow();
    } else {
      this.setupListeners();
      this.update(this.service.getLatestVersionAssetsURL());
    }
  }

  private setupListeners(): void {
    this.electronService.ipcRenderer.on('updateError', (_, updateError: UpdateError): void => {
      this.notificationService.setError("Can't install update!", updateError.error.message);
      this.closeUpdateWindow();
    });

    this.electronService.ipcRenderer.on(
      'updateDownloadProgress',
      (_, updateDownloadProgress: UpdateDownloadProgress): void => {
        this.zone.run(() => {
          this.updateProgress = updateDownloadProgress;
        });
      },
    );

    this.electronService.ipcRenderer.on('updateDownloadFinished', (): void => {
      this.zone.run(() => {
        this.page = 2;
        setTimeout(() => {
          const updateProgressBar = document.getElementById('installUpdateProgress');
          updateProgressBar.style.marginLeft = '40vw';
          this.installationAnimationInterval = setInterval(() => {
            updateProgressBar.style.marginLeft = updateProgressBar.style.marginLeft === '0vw' ? '40vw' : '0vw';
          }, 2050);
        }, 250);
      });
    });

    this.electronService.ipcRenderer.on('updateInstalled', (): void => {
      this.zone.run(() => {
        this.page = 3;
      });
    });
  }

  public closeUpdateWindow(): void {
    this.page = 1;
    clearInterval(this.installationAnimationInterval);
    this.closeFunction.emit();
  }

  private update(assetsURL: string): void {
    this.electronService.ipcRenderer.send('update', {
      assetsURL: assetsURL,
    });
  }

  public reboot(): void {
    this.systemService.sendCommand('reboot');
  }
}
