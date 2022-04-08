import { NextApiRequest, NextApiResponse } from 'next';
import { GenericObject, User } from '@models';
import axios from 'axios';
import { dateNow } from '@utils';
// import { mutate } from 'swr';

export default async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<NextApiResponse> => {
  const { method } = req;
  if (method === 'POST') return postVote(req, res);

  res.setHeader('Allow', ['POST']);
  res.status(405).end(`Method ${method} not allowed.`);
  return res;
};

/**
 * Computa soma de votos e sobe o total para o banco.
 *
 * @param req
 * @param res
 */
export const postVote = async (
  req: NextApiRequest,
  res: NextApiResponse,
): Promise<NextApiResponse> => {
  // const userList: User[] = req.body?.userList;
  const user: User = req.body?.user;
  const valuesFromForm: GenericObject = req.body?.valuesFromForm;

  // Confere senha
  if (valuesFromForm.password !== process.env.PASSPHRASE) {
    res.status(401).send({
      ok: false,
      message: 'Senha inválida',
      error: { password: 'Senha inválida' },
    });
    return res;
  }

  const date = dateNow();

  return axios
    .post(`${process.env.API_URL}/vote`, {
      user,
      valuesFromForm,
      date,
    })
    .then(() => {
      res.status(201).json({ url: `/history/${date}` });
      return res;
    })
    .catch(error => {
      res.status(400).end();
      return res;
    });
};
