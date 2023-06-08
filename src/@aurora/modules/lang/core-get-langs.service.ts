/* eslint-disable max-len */
import { Injectable } from '@angular/core';
import { GraphQLService } from '@aurora';
import { BehaviorSubject, first, map, Observable, tap } from 'rxjs';
import { CoreLang } from './lang.types';
import gql from 'graphql-tag';

@Injectable({
    providedIn: 'root',
})
export class CoreGetLangsService
{
    private langsSubject$: BehaviorSubject<CoreLang[] | null> = new BehaviorSubject(null);
    private fallbackLangSubject$: BehaviorSubject<CoreLang | null> = new BehaviorSubject(null);

    constructor(
        private readonly graphqlService: GraphQLService,
    ) {}

    /**
    * Getter for langs
    */
    get langs$(): Observable<CoreLang[]>
    {
        return this.langsSubject$.asObservable();
    }

    /**
    * Getter for fallbackLang
    */
    get fallbackLang$(): Observable<CoreLang>
    {
        return this.fallbackLangSubject$.asObservable();
    }

    get(): Observable<{
        langs: CoreLang[];
        fallbackLang: CoreLang;
    }>
    {
        return this.graphqlService
            .client()
            .watchQuery<{
                langs: CoreLang[];
                fallbackLang: CoreLang;
            }>({
                query: gql`
                    query CoreGetLangs{
                        langs: coreGetLangs
                        {
                            id
                            name
                            image
                            iso6392
                            iso6393
                            ietf
                            customCode
                            dir
                            sort
                            isActive
                        }
                        fallbackLang: coreGetFallbackLang
                        {
                            id
                            name
                            image
                            iso6392
                            iso6393
                            ietf
                            customCode
                            dir
                            sort
                            isActive
                        }
                    }
                `,
            })
            .valueChanges
            .pipe(
                first(),
                map(result => result.data),
                tap(data =>
                {
                    this.langsSubject$.next(data.langs);
                    this.fallbackLangSubject$.next(data.fallbackLang);
                }),
            );
    }
}