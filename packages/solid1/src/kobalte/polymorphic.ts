export type PolymorphicProps<T, Props> = Props & { as?: T }
export type ElementOf<T> = T extends string ? unknown : T
