import { Component, ElementRef } from '@angular/core';
import { ViewController, NavParams, Events, AlertController } from 'ionic-angular';

//pop-up page
@Component({
  selector: 'page-popup',
  templateUrl: 'popover.html'
})
export class PopoverPage{
  private rowNumber = 0;
  private page = "";

  constructor(public viewCtrl: ViewController, private navParams: NavParams, private el: ElementRef, private events: Events, private alertCtrl: AlertController) {
    this.rowNumber = this.navParams.data.row;
    this.page = this.navParams.data.page;
  }

  close() {
    this.viewCtrl.dismiss();
  }

  editItem(row){
    let alert = this.alertCtrl.create({
      title: '',
      inputs: [
        {
          name: 'qty',
          placeholder: 'Qty',
          type: 'number'
        },
        {
          name: 'disc_rate',
          placeholder: 'Item Discount (%)',
          type: 'number'
        }
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: data => {
            console.log('Cancel clicked');
          }
        },
        {
          text: 'OK',
          handler: data => {
            let qty: any = 1;
            let disc_rate: any = 0;

            if(data.qty != "") {
              qty = data.qty;
            }
            if(data.disc_rate != "") {
              disc_rate = data.disc_rate;
            }
            
            this.events.publish('row:edited',row,qty,disc_rate,this.page);
          }
        }
      ]
    });
    alert.present();

    this.close();
  }

  deleteItem(row){
    if(confirm("Are you sure?")){
      this.events.publish('row:deleted',row,this.page);
      this.close();
    }
  }
}
