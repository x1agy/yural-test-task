import { configureStore, createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchGoods, getOffers } from './api';

export const loadBrands = createAsyncThunk('search/brands', async (number, { signal }) => {
  const goods = await fetchGoods({ number, signal });
  return [...new Set(goods.map((item) => item.brand))].sort((a, b) => a.localeCompare(b));
});

export const loadOffers = createAsyncThunk('search/offers', async ({ number, brand }, { signal }) => {
  return getOffers(await fetchGoods({ number, brand, signal }));
});

const emptyResult = () => ({ items: [], status: 'idle', error: '', requestId: null });

const searchSlice = createSlice({
  name: 'search',
  initialState: { number: '', brand: '', brands: emptyResult(), offers: emptyResult() },
  reducers: {
    numberChanged(state, action) {
      state.number = action.payload;
      state.brand = '';
      state.brands = emptyResult();
      state.offers = emptyResult();
    },
    brandSelected(state, action) {
      state.brand = action.payload;
      state.offers = emptyResult();
    },
  },
  extraReducers(builder) {
    for (const [thunk, key] of [[loadBrands, 'brands'], [loadOffers, 'offers']]) {
      builder
        .addCase(thunk.pending, (state, action) => {
          state[key] = { ...emptyResult(), status: 'loading', requestId: action.meta.requestId };
        })
        .addCase(thunk.fulfilled, (state, action) => {
          if (state[key].requestId !== action.meta.requestId) return;
          state[key] = { ...emptyResult(), items: action.payload, status: 'succeeded' };
        })
        .addCase(thunk.rejected, (state, action) => {
          if (state[key].requestId !== action.meta.requestId) return;
          state[key] = {
            ...emptyResult(),
            status: action.meta.aborted ? 'idle' : 'failed',
            error: action.meta.aborted ? '' : action.error.message || 'Не удалось выполнить запрос.',
          };
        });
    }
  },
});

export const { numberChanged, brandSelected } = searchSlice.actions;
export const store = configureStore({ reducer: { search: searchSlice.reducer } });
