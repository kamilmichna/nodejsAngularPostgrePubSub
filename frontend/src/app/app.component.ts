import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import {
    BehaviorSubject,
    Observable,
    Subject,
    map,
    share,
    switchMap,
    tap,
} from 'rxjs';

interface IProduct {
    name: string;
    price: number;
    id: number;
}

type ICheckoutProduct = IProduct & { quantity: number };

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
})
export class AppComponent {
    products$: Observable<IProduct[]> | undefined;
    WebSocketEventSource = new WebSocket('websocketurl');
    refreshDataObs$ = new BehaviorSubject(true);

    productsInCheckout$: Subject<ICheckoutProduct[]> = new Subject();
    productsInCheckout: ICheckoutProduct[] = [];
    productsSum$: Observable<any> | undefined;
    constructor(private http: HttpClient) {}

    ngOnInit() {
        this.products$ = this.refreshDataObs$.pipe(
            switchMap(() =>
                this.http
                    .get(`getProducts url`)
                    .pipe(tap((data: any) => console.log(data)))
            ),
            tap((items) => {
                this.recalculateCheckout(items);
            }),
            share()
        );

        this.WebSocketEventSource.addEventListener('message', (message) => {
            alert('WEBSOCKET RUN');
            this.refreshDataObs$.next(true);
        });

        this.productsSum$ = this.productsInCheckout$.pipe(
            map((items) => {
                return items.reduce((acc: any, prev: any) => {
                    return acc + prev.price * prev.quantity;
                }, 0);
            }),
            tap((data) => console.log('RECALCULATION OF SUM'))
        );
    }

    recalculateCheckout(items: ICheckoutProduct[]) {
        if (!this.productsInCheckout?.length) return;

        alert(
            'Prices were changed in database. System will automatically recalculate prices of your items'
        );

        this.productsInCheckout = this.productsInCheckout.map((product) => {
            const newProduct = items.find((item) => item.id === product.id);
            if (!newProduct) return product;

            return {
                ...newProduct,
                quantity: product.quantity,
            };
        });

        this.productsInCheckout$.next(this.productsInCheckout);
    }

    addProductToCheckout(product: IProduct) {
        const itemIndex = this.productsInCheckout.findIndex(
            (item) => item.id === product.id
        );
        console.log(itemIndex);

        if (itemIndex >= 0) {
            this.productsInCheckout[itemIndex].quantity++;
        } else {
            this.productsInCheckout.push({
                ...product,
                quantity: 1,
            });
        }

        this.productsInCheckout$.next(this.productsInCheckout);
    }
}
