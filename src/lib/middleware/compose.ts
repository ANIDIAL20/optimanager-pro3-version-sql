
export type Middleware<TContext = any> = (
  ctx: TContext,
  next: () => Promise<any>
) => Promise<any>;

/**
 * Compose multiple middleware functions into a single function.
 * @param middlewares Array of middleware functions
 * @returns A composed middleware function
 */
export function compose<TContext>(...middlewares: Middleware<TContext>[]) {
  return async (context: TContext, finalHandler: (ctx: TContext) => Promise<any>) => {
    
    const dispatch = async (index: number): Promise<any> => {
      if (index === middlewares.length) {
        return finalHandler(context);
      }

      const middleware = middlewares[index];
      
      return middleware(context, async () => {
        return dispatch(index + 1);
      });
    };

    return dispatch(0);
  };
}

/**
 * Wrapper helper pour faciliter l'usage avec les Server Actions
 */
export function createAction<TInput, TOutput>(
  middlewares: Middleware<{ input: TInput; [key: string]: any }>[], 
  handler: (ctx: { input: TInput; [key: string]: any }) => Promise<TOutput>
) {
  const composed = compose(...middlewares);
  
  return async (input: TInput): Promise<TOutput> => {
    // Initial context
    const context: any = { input };
    
    // Execute pipeline
    return composed(context, handler);
  };
}
